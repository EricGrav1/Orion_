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

create table if not exists team_members (
  team_id uuid references teams on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null default 'member',
  created_at timestamp with time zone default now(),
  primary key (team_id, user_id),
  constraint team_members_role_check check (role in ('owner', 'admin', 'member'))
);

create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams on delete cascade not null,
  email text not null,
  role text not null default 'member',
  status text not null default 'pending',
  invited_by uuid references auth.users not null,
  token text not null unique,
  expires_at timestamp with time zone default (now() + interval '14 days'),
  created_at timestamp with time zone default now(),
  accepted_at timestamp with time zone,
  email_delivery_status text not null default 'not_sent',
  email_sent_at timestamp with time zone,
  email_last_attempt_at timestamp with time zone,
  email_attempts integer not null default 0,
  email_delivery_error text,
  constraint team_invites_role_check check (role in ('admin', 'member')),
  constraint team_invites_status_check check (status in ('pending', 'accepted', 'revoked', 'expired')),
  constraint team_invites_delivery_status_check check (email_delivery_status in ('not_sent', 'sent', 'failed'))
);

create table if not exists lms_integrations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams on delete cascade not null,
  provider text not null,
  config jsonb not null default '{}'::jsonb,
  health_status text not null default 'unknown',
  last_checked_at timestamp with time zone,
  last_error text,
  updated_by uuid references auth.users,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint lms_integrations_provider_check check (provider in ('moodle', 'scorm_cloud')),
  constraint lms_integrations_health_status_check check (health_status in ('unknown', 'healthy', 'degraded', 'failed')),
  constraint lms_integrations_team_provider_key unique (team_id, provider)
);

create table if not exists lms_integration_credentials (
  integration_id uuid primary key references lms_integrations on delete cascade,
  encrypted_payload text not null,
  iv text not null,
  auth_tag text not null,
  key_version text not null default 'v1',
  updated_at timestamp with time zone default now()
);

-- Profiles table (extends auth.users)
create table if not exists profiles (
  user_id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_tier text default 'trial',
  subscription_status text default 'active',
  trial_ends_at timestamp with time zone default (now() + interval '7 days'),
  created_at timestamp with time zone default now()
);

create table if not exists stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  payload_sha256 text,
  received_at timestamp with time zone default now()
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

create table if not exists course_share_events (
  id bigint generated always as identity primary key,
  course_id uuid references courses on delete cascade not null,
  share_token text not null,
  event_type text not null default 'view',
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- =============================================
-- INDEXES for performance
-- =============================================

create index if not exists courses_user_id_idx on courses(user_id);
create index if not exists courses_team_id_idx on courses(team_id);
create index if not exists team_members_team_id_idx on team_members(team_id);
create index if not exists team_members_user_id_idx on team_members(user_id);
create index if not exists team_invites_team_id_idx on team_invites(team_id);
create index if not exists team_invites_email_idx on team_invites(email);
create index if not exists team_invites_status_idx on team_invites(status);
create index if not exists team_invites_delivery_status_idx on team_invites(email_delivery_status);
create index if not exists team_invites_pending_email_idx on team_invites(team_id, lower(email))
  where status = 'pending';
create index if not exists lms_integrations_team_id_idx on lms_integrations(team_id);
create index if not exists lms_integrations_provider_idx on lms_integrations(provider);
create index if not exists blocks_course_id_idx on blocks(course_id);
create index if not exists blocks_order_idx on blocks("order");
create index if not exists stripe_webhook_events_received_at_idx on stripe_webhook_events(received_at desc);
create index if not exists course_share_events_course_id_idx on course_share_events(course_id);
create index if not exists course_share_events_created_at_idx on course_share_events(created_at desc);
create index if not exists course_share_events_event_type_idx on course_share_events(event_type);
create index if not exists courses_share_token_published_idx
  on courses ((settings->'share'->>'token'))
  where (settings->'share'->>'published') = 'true';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invites enable row level security;
alter table lms_integrations enable row level security;
alter table lms_integration_credentials enable row level security;
alter table profiles enable row level security;
alter table courses enable row level security;
alter table blocks enable row level security;
alter table course_share_events enable row level security;

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

drop policy if exists "Team members can view joined teams" on teams;
create policy "Team members can view joined teams"
  on teams for select
  using (
    exists (
      select 1 from team_members
      where team_members.team_id = teams.id
      and team_members.user_id = auth.uid()
    )
  );

drop policy if exists "Invitees can view teams for pending invites" on teams;
create policy "Invitees can view teams for pending invites"
  on teams for select
  using (
    exists (
      select 1 from team_invites
      where team_invites.team_id = teams.id
      and team_invites.status = 'pending'
      and team_invites.expires_at > now()
      and lower(team_invites.email) = lower(coalesce(auth.jwt()->>'email', ''))
    )
  );

drop policy if exists "Owners can view team members" on team_members;
create policy "Owners can view team members"
  on team_members for select
  using (
    exists (
      select 1 from teams
      where teams.id = team_members.team_id
      and teams.owner_id = auth.uid()
    )
  );

drop policy if exists "Admins can view team members" on team_members;
create policy "Admins can view team members"
  on team_members for select
  using (
    exists (
      select 1 from team_members as membership
      where membership.team_id = team_members.team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
    )
  );

drop policy if exists "Members can view own membership" on team_members;
create policy "Members can view own membership"
  on team_members for select
  using (team_members.user_id = auth.uid());

drop policy if exists "Owners can insert team members" on team_members;
create policy "Owners can insert team members"
  on team_members for insert
  with check (
    exists (
      select 1 from teams
      where teams.id = team_members.team_id
      and teams.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can update team members" on team_members;
create policy "Owners can update team members"
  on team_members for update
  using (
    exists (
      select 1 from teams
      where teams.id = team_members.team_id
      and teams.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can delete team members" on team_members;
create policy "Owners can delete team members"
  on team_members for delete
  using (
    exists (
      select 1 from teams
      where teams.id = team_members.team_id
      and teams.owner_id = auth.uid()
      and team_members.user_id <> teams.owner_id
    )
  );

drop policy if exists "Owners can view team invites" on team_invites;
create policy "Owners can view team invites"
  on team_invites for select
  using (
    exists (
      select 1 from teams
      where teams.id = team_invites.team_id
      and teams.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can create team invites" on team_invites;
create policy "Owners can create team invites"
  on team_invites for insert
  with check (
    exists (
      select 1 from teams
      where teams.id = team_invites.team_id
      and teams.owner_id = auth.uid()
      and team_invites.invited_by = auth.uid()
    )
  );

drop policy if exists "Admins can create team invites" on team_invites;
create policy "Admins can create team invites"
  on team_invites for insert
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from team_members as membership
      where membership.team_id = team_invites.team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
    )
  );

drop policy if exists "Owners can update team invites" on team_invites;
create policy "Owners can update team invites"
  on team_invites for update
  using (
    exists (
      select 1 from teams
      where teams.id = team_invites.team_id
      and teams.owner_id = auth.uid()
    )
  );

drop policy if exists "Admins can update team invites" on team_invites;
create policy "Admins can update team invites"
  on team_invites for update
  using (
    exists (
      select 1 from team_members as membership
      where membership.team_id = team_invites.team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
    )
  );

drop policy if exists "Owners can delete team invites" on team_invites;
create policy "Owners can delete team invites"
  on team_invites for delete
  using (
    exists (
      select 1 from teams
      where teams.id = team_invites.team_id
      and teams.owner_id = auth.uid()
    )
  );

drop policy if exists "Admins can view team invites" on team_invites;
create policy "Admins can view team invites"
  on team_invites for select
  using (
    exists (
      select 1 from team_members as membership
      where membership.team_id = team_invites.team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
    )
  );

drop policy if exists "Admins can delete team invites" on team_invites;
create policy "Admins can delete team invites"
  on team_invites for delete
  using (
    exists (
      select 1 from team_members as membership
      where membership.team_id = team_invites.team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
    )
  );

drop policy if exists "Invitees can view own pending invites" on team_invites;
create policy "Invitees can view own pending invites"
  on team_invites for select
  using (
    status = 'pending'
    and lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    and expires_at > now()
  );

drop policy if exists "Invitees can accept own pending invites" on team_invites;
create policy "Invitees can accept own pending invites"
  on team_invites for update
  using (
    status = 'pending'
    and lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    and expires_at > now()
  )
  with check (
    lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

drop policy if exists "Invitees can insert own membership via invite" on team_members;
create policy "Invitees can insert own membership via invite"
  on team_members for insert
  with check (
    user_id = auth.uid()
    and role in ('admin', 'member')
    and exists (
      select 1 from team_invites
      where team_invites.team_id = team_members.team_id
      and lower(team_invites.email) = lower(coalesce(auth.jwt()->>'email', ''))
      and team_invites.role = team_members.role
      and team_invites.status = 'pending'
      and team_invites.expires_at > now()
    )
  );

drop policy if exists "Owner/Admin can view LMS integrations" on lms_integrations;
create policy "Owner/Admin can view LMS integrations"
  on lms_integrations for select
  using (
    exists (
      select 1 from team_members as membership
      where membership.team_id = lms_integrations.team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
    )
  );

drop policy if exists "Owner/Admin can create LMS integrations" on lms_integrations;
create policy "Owner/Admin can create LMS integrations"
  on lms_integrations for insert
  with check (
    updated_by = auth.uid()
    and exists (
      select 1 from team_members as membership
      where membership.team_id = lms_integrations.team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
    )
  );

drop policy if exists "Owner/Admin can update LMS integrations" on lms_integrations;
create policy "Owner/Admin can update LMS integrations"
  on lms_integrations for update
  using (
    exists (
      select 1 from team_members as membership
      where membership.team_id = lms_integrations.team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
    )
  )
  with check (
    updated_by = auth.uid()
    and exists (
      select 1 from team_members as membership
      where membership.team_id = lms_integrations.team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
    )
  );

drop policy if exists "Owner/Admin can delete LMS integrations" on lms_integrations;
create policy "Owner/Admin can delete LMS integrations"
  on lms_integrations for delete
  using (
    exists (
      select 1 from team_members as membership
      where membership.team_id = lms_integrations.team_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
    )
  );

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

drop policy if exists "Public can view shared published courses" on courses;
create policy "Public can view shared published courses"
  on courses for select
  using (
    coalesce((settings->'share'->>'published')::boolean, false) = true
    and nullif(settings->'share'->>'token', '') is not null
  );

create policy "Users can create courses"
  on courses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own courses"
  on courses for update
  using (auth.uid() = user_id);

create policy "Users can delete their own courses"
  on courses for delete
  using (auth.uid() = user_id);

drop policy if exists "Owners can view their course share events" on course_share_events;
create policy "Owners can view their course share events"
  on course_share_events for select
  using (
    exists (
      select 1 from courses
      where courses.id = course_share_events.course_id
      and courses.user_id = auth.uid()
    )
  );

drop policy if exists "Public can insert share view events" on course_share_events;
drop policy if exists "Public can insert share analytics events" on course_share_events;
create policy "Public can insert share analytics events"
  on course_share_events for insert
  with check (
    event_type in ('view', 'resume', 'completion', 'quiz_result')
    and exists (
      select 1 from courses
      where courses.id = course_share_events.course_id
      and coalesce((courses.settings->'share'->>'published')::boolean, false) = true
      and (courses.settings->'share'->>'token') = course_share_events.share_token
    )
  );

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

drop policy if exists "Public can view blocks of shared published courses" on blocks;
create policy "Public can view blocks of shared published courses"
  on blocks for select
  using (
    exists (
      select 1 from courses
      where courses.id = blocks.course_id
      and coalesce((courses.settings->'share'->>'published')::boolean, false) = true
      and nullif(courses.settings->'share'->>'token', '') is not null
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
