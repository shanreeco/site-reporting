DO $$
BEGIN
  IF to_regclass('public.daily_tasks') IS NOT NULL THEN
    EXECUTE 'alter table public.daily_tasks enable row level security';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = ''public'' AND tablename = ''daily_tasks'' AND policyname = ''daily_tasks_select_authenticated''
    ) THEN
      EXECUTE $$
        create policy "daily_tasks_select_authenticated"
        on public.daily_tasks
        for select
        to authenticated
        using (true)
      $$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = ''public'' AND tablename = ''daily_tasks'' AND policyname = ''daily_tasks_select_anon''
    ) THEN
      EXECUTE $$
        create policy "daily_tasks_select_anon"
        on public.daily_tasks
        for select
        to anon
        using (true)
      $$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = ''public'' AND tablename = ''daily_tasks'' AND policyname = ''daily_tasks_admin_update''
    ) THEN
      EXECUTE $$
        create policy "daily_tasks_admin_update"
        on public.daily_tasks
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

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = ''public'' AND tablename = ''daily_tasks'' AND policyname = ''daily_tasks_admin_delete''
    ) THEN
      EXECUTE $$
        create policy "daily_tasks_admin_delete"
        on public.daily_tasks
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
  END IF;
END
$$;

DO $$
DECLARE
  tbl text;
  select_policy text;
  select_policy_anon text;
  update_policy text;
  delete_policy text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['concrete','manpower','materials','issues','bbs_schedule']) LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('alter table public.%I enable row level security', tbl);

      select_policy := tbl || '_select_authenticated';
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl AND policyname = select_policy
      ) THEN
        EXECUTE format(
          $$create policy "%I" on public.%I for select to authenticated using (true)$$,
          select_policy,
          tbl
        );
      END IF;

      select_policy_anon := tbl || '_select_anon';
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl AND policyname = select_policy_anon
      ) THEN
        EXECUTE format(
          $$create policy "%I" on public.%I for select to anon using (true)$$,
          select_policy_anon,
          tbl
        );
      END IF;

      update_policy := tbl || '_admin_update';
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl AND policyname = update_policy
      ) THEN
        EXECUTE format(
          $$create policy "%I" on public.%I for update to authenticated using (
              exists (
                select 1
                from public.profiles p
                where p.id = auth.uid()
                  and p.role = 'admin'
              )
            ) with check (
              exists (
                select 1
                from public.profiles p
                where p.id = auth.uid()
                  and p.role = 'admin'
              )
            )$$,
          update_policy,
          tbl
        );
      END IF;

      delete_policy := tbl || '_admin_delete';
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl AND policyname = delete_policy
      ) THEN
        EXECUTE format(
          $$create policy "%I" on public.%I for delete to authenticated using (
              exists (
                select 1
                from public.profiles p
                where p.id = auth.uid()
                  and p.role = 'admin'
              )
            )$$,
          delete_policy,
          tbl
        );
      END IF;
    END IF;
  END LOOP;
END
$$;
