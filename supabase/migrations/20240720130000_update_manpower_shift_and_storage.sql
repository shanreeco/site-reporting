DO $$
BEGIN
  IF to_regclass('public.manpower') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'manpower' AND column_name = 'shift'
    ) THEN
      EXECUTE 'alter table public.manpower add column shift text';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'manpower' AND column_name = 'hours'
    ) THEN
      EXECUTE 'update public.manpower set shift = coalesce(shift, hours::text) where shift is null and hours is not null';
    END IF;

    EXECUTE 'alter table public.manpower add column if not exists level text';
    EXECUTE 'alter table public.manpower add column if not exists zone text';
    EXECUTE 'alter table public.manpower add column if not exists photo_url text';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'manpower-photos'
  ) THEN
    PERFORM storage.create_bucket('manpower-photos', public => true);
  END IF;
END
$$;

DO $$
DECLARE
  policy_name text;
BEGIN
  policy_name := 'manpower_photos_public_read';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = policy_name
  ) THEN
    EXECUTE $$
      create policy "manpower_photos_public_read"
      on storage.objects
      for select
      using (bucket_id = 'manpower-photos')
    $$;
  END IF;

  policy_name := 'manpower_photos_authenticated_insert';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = policy_name
  ) THEN
    EXECUTE $$
      create policy "manpower_photos_authenticated_insert"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'manpower-photos' and auth.uid() = owner)
    $$;
  END IF;

  policy_name := 'manpower_photos_authenticated_update';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = policy_name
  ) THEN
    EXECUTE $$
      create policy "manpower_photos_authenticated_update"
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'manpower-photos' and auth.uid() = owner)
      with check (bucket_id = 'manpower-photos' and auth.uid() = owner)
    $$;
  END IF;

  policy_name := 'manpower_photos_authenticated_delete';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = policy_name
  ) THEN
    EXECUTE $$
      create policy "manpower_photos_authenticated_delete"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'manpower-photos' and auth.uid() = owner)
    $$;
  END IF;
END
$$;
