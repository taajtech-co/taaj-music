-- ============================================================
-- Taaj Music: database schema for Supabase
-- Run this in Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

-- Profiles table: holds the username tied to each auth user.
-- Supabase's built-in auth.users table stores email + hashed password;
-- we never touch passwords directly, Supabase Auth handles that securely.
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Songs table: metadata for each uploaded track.
-- The actual audio file lives in Supabase Storage; storage_path points to it.
create table if not exists public.songs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  artist text not null,
  storage_path text not null,
  uploader_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now()
);

alter table public.songs enable row level security;

create policy "Songs are viewable by everyone"
  on public.songs for select
  using (true);

create policy "Authenticated users can upload songs"
  on public.songs for insert
  with check (auth.uid() = uploader_id);

create policy "Users can delete their own songs"
  on public.songs for delete
  using (auth.uid() = uploader_id);

-- ============================================================
-- Storage bucket for audio files
-- ============================================================
insert into storage.buckets (id, name, public)
values ('songs', 'songs', true)
on conflict (id) do nothing;

create policy "Anyone can stream songs"
  on storage.objects for select
  using (bucket_id = 'songs');

create policy "Authenticated users can upload audio files"
  on storage.objects for insert
  with check (bucket_id = 'songs' and auth.role() = 'authenticated');

create policy "Users can delete their own audio files"
  on storage.objects for delete
  using (bucket_id = 'songs' and auth.uid()::text = (storage.foldername(name))[1]);
