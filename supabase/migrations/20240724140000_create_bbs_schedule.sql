create extension if not exists "pgcrypto";

create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.bbs_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  delivery_date date not null,
  element text not null,
  bar_mark text not null,
  diameter_mm numeric,
  length_m numeric,
  weight_tons numeric,
  supplier text,
  status text not null default 'Planned',
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bbs_schedule_delivery_date_idx on public.bbs_schedule (delivery_date);
create index if not exists bbs_schedule_status_idx on public.bbs_schedule (status);

DO $$
BEGIN
  IF to_regclass('public.bbs_schedule') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'bbs_schedule_updated_at'
    ) THEN
      EXECUTE $$
        create trigger bbs_schedule_updated_at
        before update on public.bbs_schedule
        for each row
        execute procedure public.set_current_timestamp_updated_at()
      $$;
    END IF;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.bbs_schedule') IS NOT NULL THEN
    EXECUTE 'alter table public.bbs_schedule enable row level security';
  END IF;
END
$$;

DO $$
DECLARE
  policy_name text;
BEGIN
  policy_name := 'bbs_schedule_select_authenticated';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bbs_schedule' AND policyname = policy_name
  ) THEN
    EXECUTE $$
      create policy "bbs_schedule_select_authenticated"
      on public.bbs_schedule
      for select
      to authenticated
      using (true)
    $$;
  END IF;

  policy_name := 'bbs_schedule_select_anon';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bbs_schedule' AND policyname = policy_name
  ) THEN
    EXECUTE $$
      create policy "bbs_schedule_select_anon"
      on public.bbs_schedule
      for select
      to anon
      using (true)
    $$;
  END IF;

  policy_name := 'bbs_schedule_insert_authenticated';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bbs_schedule' AND policyname = policy_name
  ) THEN
    EXECUTE $$
      create policy "bbs_schedule_insert_authenticated"
      on public.bbs_schedule
      for insert
      to authenticated
      with check (auth.uid() = user_id)
    $$;
  END IF;

  policy_name := 'bbs_schedule_admin_update';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bbs_schedule' AND policyname = policy_name
  ) THEN
    EXECUTE $$
      create policy "bbs_schedule_admin_update"
      on public.bbs_schedule
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
    $$;
  END IF;

  policy_name := 'bbs_schedule_admin_delete';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bbs_schedule' AND policyname = policy_name
  ) THEN
    EXECUTE $$
      create policy "bbs_schedule_admin_delete"
      on public.bbs_schedule
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
    $$;
  END IF;
END
$$;
