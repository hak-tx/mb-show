alter table public.admin_allowed_emails
  add column if not exists password_change_required boolean not null default true;

create or replace function public.current_sponsor_admin_status()
returns jsonb
language sql
stable
security invoker
set search_path = public, app_private, extensions, pg_temp
as $$
  with current_admin as (
    select lower(coalesce((select auth.jwt() ->> 'email'), '')) as email
  )
  select jsonb_build_object(
    'is_admin', app_private.is_sponsor_admin(),
    'email', current_admin.email,
    'role', case when app_private.is_sponsor_admin() then 'admin' else null end,
    'password_change_required', coalesce((
      select admin_allowed_emails.password_change_required
      from public.admin_allowed_emails
      where admin_allowed_emails.active is true
        and lower(admin_allowed_emails.email::text) = current_admin.email
      limit 1
    ), false)
  )
  from current_admin;
$$;

revoke all on function public.current_sponsor_admin_status() from public, anon;
grant execute on function public.current_sponsor_admin_status() to authenticated;

create or replace function public.mark_current_sponsor_admin_password_changed()
returns jsonb
language plpgsql
security definer
set search_path = public, app_private, extensions, pg_temp
as $$
declare
  current_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
begin
  if (select auth.uid()) is null or current_email = '' or not app_private.is_sponsor_admin() then
    raise exception 'not authorized';
  end if;

  update public.admin_allowed_emails
  set password_change_required = false
  where active is true
    and lower(email::text) = current_email;

  return jsonb_build_object(
    'email', current_email,
    'password_change_required', false
  );
end;
$$;

revoke all on function public.mark_current_sponsor_admin_password_changed() from public, anon;
grant execute on function public.mark_current_sponsor_admin_password_changed() to authenticated;
