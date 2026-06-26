drop policy if exists "Sponsors readable by public and admins" on public.sponsors;

create policy "Active sponsors readable by public"
  on public.sponsors
  for select
  to anon, authenticated
  using (sponsor_status = 'active');

create policy "Admins can read all sponsors"
  on public.sponsors
  for select
  to authenticated
  using (app_private.is_sponsor_admin());
