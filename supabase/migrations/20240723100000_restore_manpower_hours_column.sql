DO $$
BEGIN
  IF to_regclass('public.manpower') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'manpower'
        AND column_name = 'hours'
    ) THEN
      EXECUTE 'alter table public.manpower add column hours text';
      EXECUTE 'update public.manpower set hours = shift where hours is null and shift is not null';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'manpower_sync_hours_shift'
        AND n.nspname = 'public'
    ) THEN
      EXECUTE $fn$
        create function public.manpower_sync_hours_shift() returns trigger as $$
        begin
          if TG_OP in ('INSERT','UPDATE') then
            if new.shift is null and new.hours is not null then
              new.shift := new.hours;
            elsif new.shift is not null then
              new.hours := new.shift;
            end if;
          end if;
          return new;
        end;
        $$ language plpgsql;
      $fn$;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'manpower_sync_hours_shift_trg'
        AND tgrelid = 'public.manpower'::regclass
    ) THEN
      EXECUTE $trg$
        create trigger manpower_sync_hours_shift_trg
        before insert or update on public.manpower
        for each row
        execute function public.manpower_sync_hours_shift();
      $trg$;
    END IF;
  END IF;
END;
$$;
