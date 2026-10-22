-- ==============================================================================
-- DuoStudy / Our Study Home — Complete Supabase Database Setup
-- 100% Free Tier compatible, Strict Row-Level Security (RLS) & Realtime Wall
-- ==============================================================================

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  pair_code text unique not null,
  partner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 2. User Data Table (Completions, Day logs, and Plan state)
create table if not exists public.user_data (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  completions jsonb default '{}'::jsonb,
  today_adds jsonb default '{}'::jsonb,
  today_done jsonb default '{}'::jsonb,
  today_skips jsonb default '{}'::jsonb,
  day_log jsonb default '{}'::jsonb,
  plan_start text not null,
  queue_start text not null,
  timer_minutes integer default 0,
  current_activity text default 'Studying for NEET UG',
  updated_at timestamptz default now()
);

-- 3. Wall Messages Table (Private couple message board)
create table if not exists public.wall_messages (
  id uuid primary key default gen_random_uuid(),
  pair_key text not null,
  author text not null,
  body text not null,
  emoji text default '✨',
  created_at timestamptz default now()
);

-- Ensure columns exist if table was already created in an earlier migration
alter table public.wall_messages add column if not exists author text;
alter table public.wall_messages add column if not exists body text;
alter table public.wall_messages add column if not exists emoji text default '✨';

-- Enable Realtime for Wall Messages table ONLY (per spec)
alter publication supabase_realtime add table public.wall_messages;

-- Enable Row-Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.user_data enable row level security;
alter table public.wall_messages enable row level security;

-- ==============================================================================
-- RLS POLICIES
-- ==============================================================================

-- Profiles: Users can view their own profile or their linked partner's profile
create policy "Users can view own or partner profile" on public.profiles
  for select using (
    auth.uid() = id or auth.uid() = partner_id
  );

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- User Data: Read own data or read partner's data (Read-Only)
create policy "Users can view own data or partner data" on public.user_data
  for select using (
    auth.uid() = id or 
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.partner_id = user_data.id
    )
  );

create policy "Users can update only own data" on public.user_data
  for update using (auth.uid() = id);

create policy "Users can insert own data" on public.user_data
  for insert with check (auth.uid() = id);

-- Wall Messages: Readable and writable only by the paired couple
create policy "Couples can read their own pair wall" on public.wall_messages
  for select using (
    exists (
      select 1 from public.profiles me
      left join public.profiles partner on partner.id = me.partner_id
      where me.id = auth.uid()
      and wall_messages.pair_key = (
        case when me.partner_id is not null
          then (least(me.username, partner.username) || ':' || greatest(me.username, partner.username))
          else me.username
        end
      )
    )
  );

create policy "Couples can post to their pair wall" on public.wall_messages
  for insert with check (
    exists (
      select 1 from public.profiles me
      left join public.profiles partner on partner.id = me.partner_id
      where me.id = auth.uid()
      and wall_messages.author = me.username
    )
  );

-- ==============================================================================
-- SERVER RPCS
-- ==============================================================================

-- 1. Returns current date in Asia/Kolkata timezone (no drift from client clock)
create or replace function public.server_today()
returns text
language sql
stable
as $$
  select to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD');
$$;

-- 2. Link with Pair Code (Bidirectional)
create or replace function public.link_with_code(p_code text)
returns jsonb
language plpgsql
security definer
as $$
declare
  target_user record;
  my_id uuid := auth.uid();
begin
  if my_id is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  select * into target_user from public.profiles where lower(pair_code) = lower(trim(p_code));

  if not found then
    return jsonb_build_object('success', false, 'error', 'Pair code not found');
  end if;

  if target_user.id = my_id then
    return jsonb_build_object('success', false, 'error', 'Cannot link with your own code');
  end if;

  -- Bidirectional link
  update public.profiles set partner_id = target_user.id where id = my_id;
  update public.profiles set partner_id = my_id where id = target_user.id;

  return jsonb_build_object('success', true, 'partner_username', target_user.username);
end;
$$;

-- 3. Unlink Partner
create or replace function public.unlink_partner()
returns boolean
language plpgsql
security definer
as $$
declare
  my_id uuid := auth.uid();
  my_partner_id uuid;
begin
  select partner_id into my_partner_id from public.profiles where id = my_id;
  if my_partner_id is not null then
    update public.profiles set partner_id = null where id = my_partner_id;
  end if;
  update public.profiles set partner_id = null where id = my_id;
  return true;
end;
$$;

-- 4. Partner-only password reset (No email recovery per Web Kit rule)
create or replace function public.reset_partner_password(new_password text)
returns boolean
language plpgsql
security definer
as $$
declare
  my_id uuid := auth.uid();
  target_partner_id uuid;
begin
  select partner_id into target_partner_id from public.profiles where id = my_id;
  if target_partner_id is null then
    return false;
  end if;

  -- Updates partner's password in auth.users
  update auth.users
  set encrypted_password = crypt(new_password, gen_salt('bf'))
  where id = target_partner_id;

  return true;
end;
$$;
