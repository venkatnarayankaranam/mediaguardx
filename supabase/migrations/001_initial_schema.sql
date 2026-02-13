-- MediaGuardX Database Schema for Supabase
-- Run this migration in your Supabase SQL editor or via CLI

-- ============================================
-- 1. Profiles table (extends auth.users)
-- ============================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null,
  role text not null default 'user' check (role in ('user', 'investigator', 'admin')),
  is_active boolean default true,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins can update any profile" on profiles for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can delete profiles" on profiles for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================
-- 2. Detections table
-- ============================================
create table if not exists public.detections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  filename text not null,
  media_type text not null check (media_type in ('image', 'video', 'audio')),
  file_path text,
  file_size bigint,
  trust_score numeric(5,2),
  label text check (label in ('Authentic', 'Suspicious', 'Deepfake')),
  anomalies jsonb default '[]',
  sightengine_result jsonb,
  audio_analysis jsonb,
  metadata_analysis jsonb,
  fingerprint jsonb,
  compression_info jsonb,
  emotion_mismatch jsonb,
  sync_analysis jsonb,
  heatmap_url text,
  created_at timestamptz default now()
);
alter table public.detections enable row level security;

create policy "Users see own detections" on detections for select using (auth.uid() = user_id);
create policy "Users insert own detections" on detections for insert with check (auth.uid() = user_id);
create policy "Admins and investigators see all detections" on detections for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'investigator'))
);

-- ============================================
-- 3. Reports table
-- ============================================
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  detection_id uuid references detections on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  pdf_path text,
  case_id text,
  tamper_proof_hash text,
  created_at timestamptz default now()
);
alter table public.reports enable row level security;

create policy "Users see own reports" on reports for select using (auth.uid() = user_id);
create policy "Users create own reports" on reports for insert with check (auth.uid() = user_id);

-- ============================================
-- 4. Activity logs table
-- ============================================
create table if not exists public.activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  action text not null,
  resource_type text,
  resource_id text,
  details jsonb,
  created_at timestamptz default now()
);
alter table public.activity_logs enable row level security;

create policy "Admins see all logs" on activity_logs for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Anyone can insert logs" on activity_logs for insert with check (true);

-- ============================================
-- 5. Trigger: auto-create profile on user signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 6. Storage buckets (run in Supabase dashboard or via API)
-- ============================================
-- insert into storage.buckets (id, name, public) values ('media', 'media', false);
-- insert into storage.buckets (id, name, public) values ('reports', 'reports', false);

-- Storage RLS policies for media bucket:
-- create policy "Users can upload to own folder" on storage.objects for insert
--   with check (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Users can read own files" on storage.objects for select
--   using (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 7. Indexes for performance
-- ============================================
create index if not exists idx_detections_user_id on detections(user_id);
create index if not exists idx_detections_created_at on detections(created_at desc);
create index if not exists idx_reports_detection_id on reports(detection_id);
create index if not exists idx_activity_logs_created_at on activity_logs(created_at desc);
create index if not exists idx_profiles_role on profiles(role);
