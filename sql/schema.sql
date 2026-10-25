-- GoPath Legal: run this once in Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  profession text,
  destination text,
  password_hash text,
  role text not null default 'client' check (role in ('client','admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists password_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  purpose text not null check (purpose in ('set','reset')),
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists employers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  contact_email text,
  phone text,
  verified boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#1b6ef3',
  image_url text,
  sort int not null default 0
);

create table if not exists destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  route_text text,
  typical_time text,
  sort int not null default 0
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  employer_id uuid references employers(id) on delete restrict,
  destination_id uuid references destinations(id) on delete restrict,
  category_id uuid references categories(id) on delete restrict,
  city text,
  salary text,
  filled boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  destination text,
  profession text,
  stage int not null default 0 check (stage between 0 and 5),
  placed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists applications_user_job on applications(user_id, job_id) where job_id is not null;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  doc_type text not null,
  file_path text not null,
  file_name text,
  status text not null default 'received' check (status in ('received','approved','rejected')),
  uploaded_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  sender text not null check (sender in ('client','staff')),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists visa_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  destination text,
  route text,
  stage int not null default 0 check (stage between 0 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  destination text,
  message text not null,
  status text not null default 'new' check (status in ('new','read','replied')),
  created_at timestamptz not null default now()
);

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on notifications(user_id, read, created_at desc);

-- Every editable block of public content (stats, FAQ, team, news ...) lives here, grouped by section.
create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  title text,
  body text,
  value text,
  extra text,
  image_url text,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists content_section on content_items(section, sort);

-- Page text and image overrides. A missing key means "use the default text".
create table if not exists settings (
  key text primary key,
  value text
);

-- Only the backend (service role key) talks to the database.
-- RLS on with no policies blocks every other client.
alter table users enable row level security;
alter table password_tokens enable row level security;
alter table employers enable row level security;
alter table categories enable row level security;
alter table destinations enable row level security;
alter table jobs enable row level security;
alter table applications enable row level security;
alter table documents enable row level security;
alter table messages enable row level security;
alter table visa_cases enable row level security;
alter table contact_messages enable row level security;
alter table subscribers enable row level security;
alter table notifications enable row level security;
alter table content_items enable row level security;
alter table settings enable row level security;

-- Storage: private bucket for client documents, public bucket for site images.
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('site-media', 'site-media', true) on conflict (id) do nothing;
