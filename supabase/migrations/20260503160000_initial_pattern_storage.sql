create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  starting_credits integer not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists public.patterns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  version integer not null,
  width integer not null check (width between 1 and 256),
  height integer not null check (height between 1 and 256),
  palette_brand text not null check (palette_brand = 'mard'),
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pattern_shares (
  id uuid primary key default gen_random_uuid(),
  pattern_id uuid not null references public.patterns(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  access text not null default 'readOnly' check (access = 'readOnly'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.patterns enable row level security;
alter table public.pattern_shares enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can manage their own patterns"
  on public.patterns for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can create read-only shares"
  on public.pattern_shares for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1
      from public.patterns
      where patterns.id = pattern_shares.pattern_id
      and patterns.owner_id = auth.uid()
    )
  );

create policy "Anyone can read shared patterns"
  on public.pattern_shares for select
  using (true);
