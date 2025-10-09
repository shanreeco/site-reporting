DO $$
BEGIN
  IF to_regclass('public.manpower') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'manpower' AND column_name = 'hours'
    ) THEN
      EXECUTE 'alter table public.manpower add column hours text';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'manpower' AND column_name = 'shift'
    ) THEN
      EXECUTE 'update public.manpower set hours = shift where hours is distinct from shift';

      EXECUTE $fn$
        create or replace function public.manpower_sync_hours()
        returns trigger
        language plpgsql
        as $body$
        begin
          new.hours := new.shift;
          return new;
        end;
        $body$;
      $fn$;

      EXECUTE 'drop trigger if exists manpower_sync_hours on public.manpower';

      EXECUTE $tr$
        create trigger manpower_sync_hours
        before insert or update on public.manpower
        for each row
        execute function public.manpower_sync_hours()
      $tr$;
    END IF;
  END IF;
END
$$;
