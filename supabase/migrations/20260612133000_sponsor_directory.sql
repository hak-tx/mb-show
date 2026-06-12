create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists vector with schema extensions;

do $$
begin
  create type public.sponsor_status as enum ('draft', 'active', 'inactive', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.sponsor_tier as enum ('standard', 'featured', 'premium', 'exclusive');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  created_at timestamptz not null default now()
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  website_url text,
  lookup_url text,
  phone text,
  category text not null default 'General',
  description text,
  services text[] not null default '{}',
  service_areas text[] not null default '{}',
  cities text[] not null default '{}',
  states text[] not null default '{}',
  keywords text[] not null default '{}',
  admin_keywords text[] not null default '{}',
  source_notes text[] not null default '{}',
  source_url text,
  source_published_at date,
  lookup_status text not null default 'not_checked',
  site_title text,
  site_description text,
  logo_url text,
  sponsor_status public.sponsor_status not null default 'active',
  premium_tier public.sponsor_tier not null default 'standard',
  premium_rank integer not null default 0,
  is_featured boolean not null default false,
  admin_notes text,
  embedding extensions.vector(384),
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce(services, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(keywords, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(admin_keywords, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', array_to_string(coalesce(service_areas, '{}'), ' ')), 'C') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(coalesce(source_notes, '{}'), ' ')), 'D')
  ) stored
);

create table if not exists public.sponsor_search_terms (
  id bigint generated always as identity primary key,
  phrase text not null unique,
  expands_to text[] not null default '{}',
  category_hint text,
  weight numeric not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsor_leads (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid references public.sponsors (id) on delete set null,
  search_query text,
  visitor_city text,
  visitor_state text,
  lead_type text not null default 'click',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists sponsors_status_idx on public.sponsors (sponsor_status);
create index if not exists sponsors_category_idx on public.sponsors (category);
create index if not exists sponsors_tier_rank_idx on public.sponsors (premium_tier, premium_rank desc);
create index if not exists sponsors_search_document_idx on public.sponsors using gin (search_document);
create index if not exists sponsors_name_trgm_idx on public.sponsors using gin (lower(name) gin_trgm_ops);
create index if not exists sponsors_keywords_idx on public.sponsors using gin (keywords);
create index if not exists sponsors_service_areas_idx on public.sponsors using gin (service_areas);
create index if not exists sponsor_search_terms_phrase_idx on public.sponsor_search_terms using gin (lower(phrase) gin_trgm_ops);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sponsors_touch_updated_at on public.sponsors;
create trigger sponsors_touch_updated_at
before update on public.sponsors
for each row execute function public.touch_updated_at();

drop trigger if exists sponsor_search_terms_touch_updated_at on public.sponsor_search_terms;
create trigger sponsor_search_terms_touch_updated_at
before update on public.sponsor_search_terms
for each row execute function public.touch_updated_at();

create or replace function public.is_sponsor_admin()
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

create or replace function public.expand_sponsor_query(search_query text)
returns text
language sql
stable
security invoker
as $$
  select trim(
    concat_ws(
      ' ',
      coalesce(search_query, ''),
      (
        select string_agg(array_to_string(expands_to, ' '), ' ')
        from public.sponsor_search_terms
        where lower(coalesce(search_query, '')) like '%' || lower(phrase) || '%'
      )
    )
  );
$$;

create or replace function public.search_sponsors(
  search_query text default '',
  city_filter text default null,
  state_filter text default null,
  area_filter text default null,
  result_limit integer default 25
)
returns table (
  id uuid,
  slug text,
  name text,
  website_url text,
  phone text,
  category text,
  description text,
  services text[],
  service_areas text[],
  premium_tier public.sponsor_tier,
  is_featured boolean,
  score real
)
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  expanded_query text := public.expand_sponsor_query(search_query);
  ts_query tsquery;
begin
  ts_query := case
    when nullif(trim(expanded_query), '') is null then null
    else websearch_to_tsquery('english', expanded_query)
  end;

  return query
  select
    s.id,
    s.slug,
    s.name,
    s.website_url,
    s.phone,
    s.category,
    s.description,
    s.services,
    s.service_areas,
    s.premium_tier,
    s.is_featured,
    (
      case when ts_query is null then 0 else ts_rank_cd(s.search_document, ts_query) * 10 end +
      case when nullif(trim(search_query), '') is null then 0 else similarity(lower(s.name), lower(search_query)) * 4 end +
      case when s.is_featured then 1.5 else 0 end +
      case s.premium_tier
        when 'exclusive' then 4
        when 'premium' then 3
        when 'featured' then 1.75
        else 0
      end +
      greatest(s.premium_rank, 0) * 0.1
    )::real as score
  from public.sponsors s
  where s.sponsor_status = 'active'
    and (
      ts_query is null
      or s.search_document @@ ts_query
      or lower(s.name) % lower(search_query)
      or exists (
        select 1
        from unnest(s.keywords || s.admin_keywords || s.services) term
        where lower(term) like '%' || lower(search_query) || '%'
      )
    )
    and (
      city_filter is null
      or city_filter = ''
      or exists (select 1 from unnest(s.cities || s.service_areas) city where lower(city) like '%' || lower(city_filter) || '%')
    )
    and (
      state_filter is null
      or state_filter = ''
      or exists (select 1 from unnest(s.states || s.service_areas) state where lower(state) like '%' || lower(state_filter) || '%')
    )
    and (
      area_filter is null
      or area_filter = ''
      or exists (select 1 from unnest(s.service_areas) area where lower(area) like '%' || lower(area_filter) || '%')
    )
  order by score desc, s.is_featured desc, s.premium_rank desc, s.name asc
  limit least(greatest(result_limit, 1), 100);
end;
$$;

insert into public.sponsor_search_terms (phrase, expands_to, category_hint, weight) values
  ('patio', array['outdoor living', 'outdoor kitchen', 'pavers', 'landscape', 'shade', 'deck', 'backyard'], 'Home Improvement', 2),
  ('outdoor kitchen', array['patio', 'outdoor living', 'landscape', 'pavers', 'deck', 'backyard'], 'Home Improvement', 2),
  ('hvac', array['air conditioning', 'ac repair', 'heating', 'cooling', 'trane'], 'HVAC', 2),
  ('ac', array['hvac', 'air conditioning', 'cooling', 'ac repair'], 'HVAC', 2),
  ('air conditioner', array['hvac', 'air conditioning', 'cooling', 'ac repair'], 'HVAC', 2),
  ('plumbing', array['plumber', 'pipes', 'water heater', 'drain', 'leak'], 'Plumbing & Electrical', 2),
  ('generator', array['backup power', 'whole-home generator', 'electrical'], 'Plumbing & Electrical', 2),
  ('roof', array['roofing', 'roof repair', 'roof replacement', 'siding', 'home improvement'], 'Home Improvement', 2),
  ('foundation', array['foundation repair', 'slab', 'structural repair'], 'Home Improvement', 2),
  ('lawyer', array['attorney', 'law firm', 'legal'], 'Legal & Financial', 2),
  ('doctor', array['medical', 'health', 'wellness', 'physician'], 'Medical & Wellness', 2),
  ('restaurant', array['dining', 'food', 'coffee', 'tex-mex'], 'Food & Restaurants', 2)
on conflict (phrase) do update set
  expands_to = excluded.expands_to,
  category_hint = excluded.category_hint,
  weight = excluded.weight,
  updated_at = now();

alter table public.admin_users enable row level security;
alter table public.sponsors enable row level security;
alter table public.sponsor_search_terms enable row level security;
alter table public.sponsor_leads enable row level security;

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
on public.admin_users for select
to authenticated
using (public.is_sponsor_admin());

drop policy if exists "Public can read active sponsors" on public.sponsors;
create policy "Public can read active sponsors"
on public.sponsors for select
to anon, authenticated
using (sponsor_status = 'active' or public.is_sponsor_admin());

drop policy if exists "Admins can manage sponsors" on public.sponsors;
create policy "Admins can manage sponsors"
on public.sponsors for all
to authenticated
using (public.is_sponsor_admin())
with check (public.is_sponsor_admin());

drop policy if exists "Public can read search terms" on public.sponsor_search_terms;
create policy "Public can read search terms"
on public.sponsor_search_terms for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage search terms" on public.sponsor_search_terms;
create policy "Admins can manage search terms"
on public.sponsor_search_terms for all
to authenticated
using (public.is_sponsor_admin())
with check (public.is_sponsor_admin());

drop policy if exists "Public can create lead events" on public.sponsor_leads;
create policy "Public can create lead events"
on public.sponsor_leads for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can read lead events" on public.sponsor_leads;
create policy "Admins can read lead events"
on public.sponsor_leads for select
to authenticated
using (public.is_sponsor_admin());

grant usage on schema public to anon, authenticated;
grant select on public.sponsors to anon, authenticated;
grant select on public.sponsor_search_terms to anon, authenticated;
grant insert on public.sponsor_leads to anon, authenticated;
grant all on public.sponsors to authenticated;
grant all on public.sponsor_search_terms to authenticated;
grant select on public.sponsor_leads to authenticated;
grant execute on function public.search_sponsors(text, text, text, text, integer) to anon, authenticated;
grant execute on function public.expand_sponsor_query(text) to anon, authenticated;
