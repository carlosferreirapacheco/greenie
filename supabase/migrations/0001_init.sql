-- Plants owned by a user
create table if not exists plants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text,
  photo_urls text[],
  location text,
  created_at timestamptz not null default now()
);

create index if not exists plants_owner_id_idx on plants(owner_id);

-- Care tasks (watering, fertilizing, repotting) tied to a plant
create table if not exists care_tasks (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants(id) on delete cascade,
  type text not null check (type in ('water', 'fertilize', 'repot')),
  frequency_days integer not null,
  last_done timestamptz,
  next_due timestamptz
);

create index if not exists care_tasks_plant_id_idx on care_tasks(plant_id);
create index if not exists care_tasks_next_due_idx on care_tasks(next_due);

-- Social posts about a plant
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists posts_plant_id_idx on posts(plant_id);
create index if not exists posts_user_id_idx on posts(user_id);

-- Follower relationships between users
create table if not exists follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists follows_followee_id_idx on follows(followee_id);

-- Likes on posts
create table if not exists likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists likes_user_id_idx on likes(user_id);

-- Comments on posts
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_id_idx on comments(post_id);

-- Row Level Security
alter table plants enable row level security;
alter table care_tasks enable row level security;
alter table posts enable row level security;
alter table follows enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;

-- plants: owner has full access; nobody else can read (private by default)
create policy "plants_select_own" on plants
  for select using (auth.uid() = owner_id);
create policy "plants_insert_own" on plants
  for insert with check (auth.uid() = owner_id);
create policy "plants_update_own" on plants
  for update using (auth.uid() = owner_id);
create policy "plants_delete_own" on plants
  for delete using (auth.uid() = owner_id);

-- care_tasks: access follows the parent plant's owner
create policy "care_tasks_select_own" on care_tasks
  for select using (
    exists (select 1 from plants where plants.id = care_tasks.plant_id and plants.owner_id = auth.uid())
  );
create policy "care_tasks_insert_own" on care_tasks
  for insert with check (
    exists (select 1 from plants where plants.id = care_tasks.plant_id and plants.owner_id = auth.uid())
  );
create policy "care_tasks_update_own" on care_tasks
  for update using (
    exists (select 1 from plants where plants.id = care_tasks.plant_id and plants.owner_id = auth.uid())
  );
create policy "care_tasks_delete_own" on care_tasks
  for delete using (
    exists (select 1 from plants where plants.id = care_tasks.plant_id and plants.owner_id = auth.uid())
  );

-- posts: publicly readable (social feed), only the author can write
create policy "posts_select_all" on posts
  for select using (true);
create policy "posts_insert_own" on posts
  for insert with check (auth.uid() = user_id);
create policy "posts_update_own" on posts
  for update using (auth.uid() = user_id);
create policy "posts_delete_own" on posts
  for delete using (auth.uid() = user_id);

-- follows: publicly readable (follower/followee lists), only the follower can create/remove their own edge
create policy "follows_select_all" on follows
  for select using (true);
create policy "follows_insert_own" on follows
  for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on follows
  for delete using (auth.uid() = follower_id);

-- likes: publicly readable (like counts), only the liker can create/remove their own like
create policy "likes_select_all" on likes
  for select using (true);
create policy "likes_insert_own" on likes
  for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on likes
  for delete using (auth.uid() = user_id);

-- comments: publicly readable, only the author can write/edit/delete their own comment
create policy "comments_select_all" on comments
  for select using (true);
create policy "comments_insert_own" on comments
  for insert with check (auth.uid() = user_id);
create policy "comments_update_own" on comments
  for update using (auth.uid() = user_id);
create policy "comments_delete_own" on comments
  for delete using (auth.uid() = user_id);
