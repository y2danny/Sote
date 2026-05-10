
create or replace function public.sign_and_pay(_invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invoices;
  sig text;
begin
  select * into inv from public.invoices where id = _invoice_id;
  if not found then raise exception 'invoice not found'; end if;
  if inv.importer_id <> auth.uid() then raise exception 'forbidden'; end if;
  if inv.status <> 'awaiting_payment' then raise exception 'invalid state'; end if;

  sig := encode(gen_random_bytes(32), 'hex');

  update public.invoices set
    status = 'on_chain_pending',
    pay_tx_signature = sig,
    invoice_pda = encode(gen_random_bytes(32), 'hex'),
    on_chain_slot = (extract(epoch from now())*1000)::bigint,
    paid_at = now(),
    next_advance_at = now() + interval '3 seconds'
  where id = _invoice_id
  returning * into inv;

  insert into public.offramp_events(invoice_id, event_type, payload)
  values (_invoice_id, 'submitted', jsonb_build_object('signature', sig));

  return inv;
end$$;

create or replace function public.advance_invoice(_invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invoices;
begin
  select * into inv from public.invoices where id = _invoice_id;
  if not found then raise exception 'not found'; end if;
  if inv.importer_id <> auth.uid() and not public.has_role(auth.uid(),'operator') then
    raise exception 'forbidden';
  end if;
  if inv.next_advance_at is null or inv.next_advance_at > now() then
    return inv; -- not time yet
  end if;

  if inv.status = 'on_chain_pending' then
    update public.invoices set
      status = 'on_chain_confirmed',
      next_advance_at = now() + interval '4 seconds'
    where id = _invoice_id returning * into inv;
    insert into public.offramp_events(invoice_id, event_type, payload)
    values (_invoice_id, 'confirmed', jsonb_build_object('slot', inv.on_chain_slot));

  elsif inv.status = 'on_chain_confirmed' then
    if inv.corridor = 'direct_pusd' then
      update public.invoices set
        status = 'delivered',
        release_tx_signature = encode(gen_random_bytes(32),'hex'),
        delivered_at = now(),
        next_advance_at = null
      where id = _invoice_id returning * into inv;
      insert into public.offramp_events(invoice_id, event_type, payload)
      values (_invoice_id, 'released_direct', '{}'::jsonb);
    else
      update public.invoices set
        status = 'offramp_processing',
        offramp_reference = 'BRG-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,10)),
        next_advance_at = now() + interval '6 seconds'
      where id = _invoice_id returning * into inv;
      insert into public.offramp_events(invoice_id, event_type, payload)
      values (_invoice_id, 'offramp_initiated', jsonb_build_object('reference', inv.offramp_reference));
    end if;

  elsif inv.status = 'offramp_processing' then
    if inv.force_failure then
      update public.invoices set
        status = 'offramp_failed',
        offramp_error = 'Beneficiary bank rejected wire (test scenario)',
        next_advance_at = null
      where id = _invoice_id returning * into inv;
      insert into public.offramp_events(invoice_id, event_type, payload)
      values (_invoice_id, 'offramp_failed', jsonb_build_object('error', inv.offramp_error));
    else
      update public.invoices set
        status = 'delivered',
        release_tx_signature = encode(gen_random_bytes(32),'hex'),
        delivered_at = now(),
        next_advance_at = null
      where id = _invoice_id returning * into inv;
      insert into public.offramp_events(invoice_id, event_type, payload)
      values (_invoice_id, 'offramp_delivered', '{}'::jsonb);
    end if;
  end if;

  return inv;
end$$;

create or replace function public.operator_retry(_invoice_id uuid)
returns public.invoices
language plpgsql security definer set search_path = public
as $$
declare inv public.invoices;
begin
  if not public.has_role(auth.uid(),'operator') then raise exception 'forbidden'; end if;
  update public.invoices set
    status = 'offramp_processing',
    offramp_error = null,
    force_failure = false,
    next_advance_at = now() + interval '4 seconds'
  where id = _invoice_id and status = 'offramp_failed'
  returning * into inv;
  insert into public.audit_log(operator_id, action, invoice_id, metadata)
  values (auth.uid(), 'retry', _invoice_id, '{}'::jsonb);
  insert into public.offramp_events(invoice_id, event_type, payload)
  values (_invoice_id, 'retry', '{}'::jsonb);
  return inv;
end$$;

create or replace function public.operator_refund(_invoice_id uuid)
returns public.invoices
language plpgsql security definer set search_path = public
as $$
declare inv public.invoices;
begin
  if not public.has_role(auth.uid(),'operator') then raise exception 'forbidden'; end if;
  update public.invoices set
    status = 'refunded',
    refund_tx_signature = encode(gen_random_bytes(32),'hex'),
    next_advance_at = null
  where id = _invoice_id and status in ('offramp_failed','on_chain_confirmed','offramp_processing')
  returning * into inv;
  insert into public.audit_log(operator_id, action, invoice_id, metadata)
  values (auth.uid(), 'refund', _invoice_id, '{}'::jsonb);
  insert into public.offramp_events(invoice_id, event_type, payload)
  values (_invoice_id, 'refunded', '{}'::jsonb);
  return inv;
end$$;

create or replace function public.grant_operator()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'operator')
  on conflict do nothing;
end$$;

revoke execute on function public.sign_and_pay(uuid) from public, anon;
revoke execute on function public.advance_invoice(uuid) from public, anon;
revoke execute on function public.operator_retry(uuid) from public, anon;
revoke execute on function public.operator_refund(uuid) from public, anon;
revoke execute on function public.grant_operator() from public, anon;
