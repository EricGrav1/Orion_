-- ORION Database Schema
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/czhrljzmlnbeefxpxcje/sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Teams table
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users not null,
  subscription_id text,
  seat_count integer default 1,
  created_at timestamp with time zone default now()
);

-- Profiles table (extends auth.users)
create table if not exists profiles (
  user_id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  subscription_tier text default 'trial',
  subscription_status text default 'active',
  trial_ends_at timestamp with time zone default (now() + interval '7 days'),
  created_at timestamp with time zone default now()
);

-- Courses table
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  team_id uuid references teams,
  title text not null default 'Untitled Course',
  description text,
  status text default 'draft',
  settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Blocks table
create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses on delete cascade not null,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  settings jsonb default '{}'::jsonb,
  "order" integer not null,
  created_at timestamp with time zone default now()
);

-- =============================================
-- INDEXES for performance
-- =============================================

create index if not exists courses_user_id_idx on courses(user_id);
create index if not exists courses_team_id_idx on courses(team_id);
create index if not exists blocks_course_id_idx on blocks(course_id);
create index if not exists blocks_order_idx on blocks("order");

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
alter table teams enable row level security;
alter table profiles enable row level security;
alter table courses enable row level security;
alter table blocks enable row level security;

-- Teams policies
create policy "Users can view their own teams"
  on teams for select
  using (auth.uid() = owner_id);

create policy "Users can create teams"
  on teams for insert
  with check (auth.uid() = owner_id);

create policy "Team owners can update their teams"
  on teams for update
  using (auth.uid() = owner_id);

create policy "Team owners can delete their teams"
  on teams for delete
  using (auth.uid() = owner_id);

-- Profiles policies
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = user_id);

create policy "Users can create their own profile"
  on profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = user_id);

-- Courses policies
create policy "Users can view their own courses"
  on courses for select
  using (auth.uid() = user_id);

create policy "Users can create courses"
  on courses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own courses"
  on courses for update
  using (auth.uid() = user_id);

create policy "Users can delete their own courses"
  on courses for delete
  using (auth.uid() = user_id);

-- Blocks policies
create policy "Users can view blocks of their courses"
  on blocks for select
  using (
    exists (
      select 1 from courses
      where courses.id = blocks.course_id
      and courses.user_id = auth.uid()
    )
  );

create policy "Users can create blocks in their courses"
  on blocks for insert
  with check (
    exists (
      select 1 from courses
      where courses.id = blocks.course_id
      and courses.user_id = auth.uid()
    )
  );

create policy "Users can update blocks in their courses"
  on blocks for update
  using (
    exists (
      select 1 from courses
      where courses.id = blocks.course_id
      and courses.user_id = auth.uid()
    )
  );

create policy "Users can delete blocks in their courses"
  on blocks for delete
  using (
    exists (
      select 1 from courses
      where courses.id = blocks.course_id
      and courses.user_id = auth.uid()
    )
  );

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at on courses
drop trigger if exists on_course_updated on courses;
create trigger on_course_updated
  before update on courses
  for each row execute procedure public.handle_updated_at();

-- =============================================
-- STORAGE BUCKETS (for course assets)
-- =============================================

-- Create storage bucket for course assets (images, videos, etc.)
insert into storage.buckets (id, name, public)
values ('course-assets', 'course-assets', true)
on conflict (id) do nothing;

-- Storage policies for course-assets bucket
create policy "Users can upload their own assets"
  on storage.objects for insert
  with check (
    bucket_id = 'course-assets' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view all course assets"
  on storage.objects for select
  using (bucket_id = 'course-assets');

create policy "Users can update their own assets"
  on storage.objects for update
  using (
    bucket_id = 'course-assets' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own assets"
  on storage.objects for delete
  using (
    bucket_id = 'course-assets' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
