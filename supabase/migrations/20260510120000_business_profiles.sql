-- Business profile per user — drives chat context and program matching.
create table if not exists public.business_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text,
  province text,                       -- two-letter code (ON, QC, BC, ...)
  industry text,                       -- e.g. "saas", "manufacturing", "cleantech"
  employees int,
  annual_revenue_range text,           -- e.g. "pre-revenue", "<100k", "100k-1m", "1m-5m", "5m+"
  founded_year int,
  funding_purpose text,                -- free text: what they need money for
  incorporated boolean default false,
  woman_owned boolean default false,
  indigenous_owned boolean default false,
  exports boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;

create policy "Owner can read own business profile"
  on public.business_profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Owner can insert own business profile"
  on public.business_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Owner can update own business profile"
  on public.business_profiles for update
  to authenticated
  using (auth.uid() = user_id);

create trigger business_profiles_set_updated_at
  before update on public.business_profiles
  for each row execute function public.set_updated_at();
