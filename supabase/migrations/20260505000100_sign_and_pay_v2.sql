-- =========================================================================
-- 20260505000100_sign_and_pay_v2.sql
--
-- Adds a v2 of sign_and_pay that accepts a real Solana signature produced
-- client-side after the user signs the transfer transaction. The legacy
-- sign_and_pay (no args) stays around so that the simulate-only path
-- continues to work when VITE_SIMULATE_SIGNING=true.
--
-- Compatibility:
--   * `sign_and_pay(_invoice_id uuid)` from the original migration still exists.
--   * `sign_and_pay_v2(_invoice_id uuid, _pay_tx_signature text, _invoice_pda text)`
--     is the new path — preferred when the client has a real signature.
-- =========================================================================

create or replace function public.sign_and_pay_v2(
  _invoice_id uuid,
  _pay_tx_signature text,
  _invoice_pda text
) returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invoices;
begin
  if _pay_tx_signature is null or length(_pay_tx_signature) < 32 then
    raise exception 'invalid signature';
  end if;

  select * into inv from public.invoices where id = _invoice_id;
  if not found then raise exception 'invoice not found'; end if;
  if inv.importer_id <> auth.uid() then raise exception 'forbidden'; end if;
  if inv.status <> 'awaiting_payment' then raise exception 'invalid state'; end if;

  update public.invoices set
    status = 'on_chain_pending',
    pay_tx_signature = _pay_tx_signature,
    invoice_pda = coalesce(_invoice_pda, encode(gen_random_bytes(32), 'hex')),
    on_chain_slot = (extract(epoch from now())*1000)::bigint,
    paid_at = now(),
    next_advance_at = now() + interval '3 seconds'
  where id = _invoice_id
  returning * into inv;

  insert into public.offramp_events(invoice_id, event_type, payload)
  values (_invoice_id, 'submitted', jsonb_build_object(
    'signature', _pay_tx_signature,
    'pda', inv.invoice_pda,
    'real_chain', true
  ));

  return inv;
end$$;

revoke execute on function public.sign_and_pay_v2(uuid, text, text) from public, anon;
grant execute on function public.sign_and_pay_v2(uuid, text, text) to authenticated;

comment on function public.sign_and_pay_v2(uuid, text, text) is
  'Records a real client-signed Solana transfer signature against an awaiting_payment invoice and kicks off the off-ramp state machine.';
