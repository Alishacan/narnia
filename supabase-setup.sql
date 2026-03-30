-- ============================================
-- NARNIA - Supabase Database Setup
-- ============================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- CLOTHING ITEMS
-- ============================================
create table clothing_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  image_url text not null,
  thumbnail_url text,
  category text not null default 'other',
  subcategory text,
  color text not null default '#808080',
  secondary_color text,
  season text not null default 'all-season',
  occasion text not null default 'casual',
  brand text,
  size text,
  price numeric(10,2),
  notes text,
  is_favorite boolean not null default false,
  in_laundry boolean not null default false,
  wear_count integer not null default 0,
  last_worn_at date,
  created_at timestamptz not null default now()
);

-- Index for fast lookups
create index idx_clothing_items_user on clothing_items(user_id);
create index idx_clothing_items_category on clothing_items(user_id, category);

-- Row Level Security: users can only see their own items
alter table clothing_items enable row level security;

create policy "Users can view own items"
  on clothing_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own items"
  on clothing_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own items"
  on clothing_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own items"
  on clothing_items for delete
  using (auth.uid() = user_id);

-- ============================================
-- OUTFITS
-- ============================================
create table outfits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  occasion text,
  season text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_outfits_user on outfits(user_id);

alter table outfits enable row level security;

create policy "Users can view own outfits"
  on outfits for select using (auth.uid() = user_id);

create policy "Users can insert own outfits"
  on outfits for insert with check (auth.uid() = user_id);

create policy "Users can update own outfits"
  on outfits for update using (auth.uid() = user_id);

create policy "Users can delete own outfits"
  on outfits for delete using (auth.uid() = user_id);

-- ============================================
-- OUTFIT ITEMS (junction table)
-- ============================================
create table outfit_items (
  id uuid primary key default uuid_generate_v4(),
  outfit_id uuid references outfits(id) on delete cascade not null,
  clothing_item_id uuid references clothing_items(id) on delete cascade not null
);

create index idx_outfit_items_outfit on outfit_items(outfit_id);

alter table outfit_items enable row level security;

create policy "Users can view own outfit items"
  on outfit_items for select
  using (
    exists (select 1 from outfits where outfits.id = outfit_items.outfit_id and outfits.user_id = auth.uid())
  );

create policy "Users can insert own outfit items"
  on outfit_items for insert
  with check (
    exists (select 1 from outfits where outfits.id = outfit_items.outfit_id and outfits.user_id = auth.uid())
  );

create policy "Users can delete own outfit items"
  on outfit_items for delete
  using (
    exists (select 1 from outfits where outfits.id = outfit_items.outfit_id and outfits.user_id = auth.uid())
  );

-- ============================================
-- WEAR LOG
-- ============================================
create table wear_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  outfit_id uuid references outfits(id) on delete cascade not null,
  worn_date date not null default current_date
);

create index idx_wear_log_user_date on wear_log(user_id, worn_date);

alter table wear_log enable row level security;

create policy "Users can view own wear log"
  on wear_log for select using (auth.uid() = user_id);

create policy "Users can insert own wear log"
  on wear_log for insert with check (auth.uid() = user_id);

create policy "Users can delete own wear log"
  on wear_log for delete using (auth.uid() = user_id);

-- ============================================
-- PACKING LISTS
-- ============================================
create table packing_lists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  trip_name text not null,
  destination text,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

alter table packing_lists enable row level security;

create policy "Users can manage own packing lists"
  on packing_lists for all using (auth.uid() = user_id);

-- ============================================
-- PACKING LIST OUTFITS
-- ============================================
create table packing_list_outfits (
  id uuid primary key default uuid_generate_v4(),
  packing_list_id uuid references packing_lists(id) on delete cascade not null,
  outfit_id uuid references outfits(id) on delete cascade not null,
  day_date date
);

alter table packing_list_outfits enable row level security;

create policy "Users can manage own packing list outfits"
  on packing_list_outfits for all
  using (
    exists (select 1 from packing_lists where packing_lists.id = packing_list_outfits.packing_list_id and packing_lists.user_id = auth.uid())
  );

-- ============================================
-- PACKING LIST ITEMS
-- ============================================
create table packing_list_items (
  id uuid primary key default uuid_generate_v4(),
  packing_list_id uuid references packing_lists(id) on delete cascade not null,
  clothing_item_id uuid references clothing_items(id) on delete cascade not null,
  is_packed boolean not null default false
);

alter table packing_list_items enable row level security;

create policy "Users can manage own packing list items"
  on packing_list_items for all
  using (
    exists (select 1 from packing_lists where packing_lists.id = packing_list_items.packing_list_id and packing_lists.user_id = auth.uid())
  );

-- ============================================
-- STORAGE BUCKET for clothing images
-- ============================================
-- Run this separately in the SQL editor:
insert into storage.buckets (id, name, public) values ('clothing-images', 'clothing-images', true);

-- Storage policies
create policy "Users can upload own images"
  on storage.objects for insert
  with check (bucket_id = 'clothing-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view clothing images"
  on storage.objects for select
  using (bucket_id = 'clothing-images');

create policy "Users can delete own images"
  on storage.objects for delete
  using (bucket_id = 'clothing-images' and auth.uid()::text = (storage.foldername(name))[1]);
