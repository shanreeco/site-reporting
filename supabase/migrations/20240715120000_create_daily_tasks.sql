create extension if not exists "pgcrypto";

create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  task_date date not null default current_date,
  title text not null,
  status text not null default 'ongoing',
  verified boolean not null default false,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  remarks text,
  carry_over_from uuid references public.daily_tasks (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_tasks_status_check check (status in ('completed', 'ongoing', 'rejected'))
);

create index if not exists daily_tasks_task_date_idx on public.daily_tasks (task_date);
create index if not exists daily_tasks_status_idx on public.daily_tasks (status);
create index if not exists daily_tasks_carry_idx on public.daily_tasks (carry_over_from);

create trigger daily_tasks_updated_at
before update on public.daily_tasks
for each row
execute procedure public.set_current_timestamp_updated_at();
