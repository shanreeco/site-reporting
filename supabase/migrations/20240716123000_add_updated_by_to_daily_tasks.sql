alter table public.daily_tasks
  add column if not exists updated_by uuid references public.profiles (id) on delete set null;

create index if not exists daily_tasks_updated_by_idx on public.daily_tasks (updated_by);

update public.daily_tasks t
set updated_by = t.user_id
where updated_by is null
  and exists (
    select 1
    from public.profiles p
    where p.id = t.user_id
  );
