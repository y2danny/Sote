
drop policy "offramp_events insert system" on public.offramp_events;
create policy "offramp_events insert importer" on public.offramp_events for insert to authenticated
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and i.importer_id = auth.uid()));
create policy "offramp_events insert operator" on public.offramp_events for insert to authenticated
  with check (public.has_role(auth.uid(),'operator'));

revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- has_role is needed inside RLS expressions; restrict direct callers but allow definer use within policies
revoke execute on function public.has_role(uuid, app_role) from public, anon;
