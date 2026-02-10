-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO SETUP THE DATABASE

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Trades Table
create table public.trades (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid default auth.uid(), -- For future auth
  title text not null,
  trade_type text not null check (trade_type in ('R_F', 'TOUCHED')),
  market text not null,
  timeframe text,
  direction text check (direction in ('Rise', 'Fall', 'N/A')),
  stake numeric,
  payout numeric,
  profit numeric,
  outcome text check (outcome in ('Win', 'Loss', 'BE')),
  entry_time_iso timestamptz default now(),
  notes text,
  what_i_saw text,
  what_worked text,
  what_didnt text,
  tags text[],
  strategy_id uuid, -- Foreign key link to strategy if exists
  screenshots jsonb default '[]'::jsonb,
  confidence integer default 3,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Create Strategies Table
create table public.strategies (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid default auth.uid(),
  name text not null,
  summary text,
  trigger text,
  confirmation text,
  risk_rules text,
  execution text,
  avoid text,
  examples text,
  tags text[],
  is_top boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Create Settings Table (Single row per user)
create table public.settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid default auth.uid(),
  currency text default '$',
  updated_at timestamptz default now()
);

-- 4. Enable Row Level Security (RLS)
alter table public.trades enable row level security;
alter table public.strategies enable row level security;
alter table public.settings enable row level security;

-- 5. Create Policies to allow ANYONE (Anon) to read/write for now
-- Since you are skipping Auth for now to keep it simple, we allow anon access.
-- WARNING: This means anyone with your URL/Key can edit. For a personal app, this is okay temporarily.
create policy "Allow Anon Select Trades" on public.trades for select using (true);
create policy "Allow Anon Insert Trades" on public.trades for insert with check (true);
create policy "Allow Anon Update Trades" on public.trades for update using (true);
create policy "Allow Anon Delete Trades" on public.trades for delete using (true);

create policy "Allow Anon Select Strategies" on public.strategies for select using (true);
create policy "Allow Anon Insert Strategies" on public.strategies for insert with check (true);
create policy "Allow Anon Update Strategies" on public.strategies for update using (true);
create policy "Allow Anon Delete Strategies" on public.strategies for delete using (true);

create policy "Allow Anon Select Settings" on public.settings for select using (true);
create policy "Allow Anon Insert Settings" on public.settings for insert with check (true);
create policy "Allow Anon Update Settings" on public.settings for update using (true);

-- 6. Insert Default Setting
insert into public.settings (currency) values ('$');
