-- Create notes table
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  content text,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.notes enable row level security;

-- Create policies
create policy "Users can translate their own notes."
  on public.notes for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own notes."
  on public.notes for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own notes."
  on public.notes for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own notes."
  on public.notes for delete
  using ( auth.uid() = user_id );
