ALTER TABLE skill_listings
  ADD COLUMN IF NOT EXISTS demo_video_urls TEXT[] NOT NULL DEFAULT '{}';

UPDATE skill_listings
SET demo_video_urls = '{}'
WHERE demo_video_urls IS NULL;

ALTER TABLE skill_listings
  ALTER COLUMN demo_video_urls SET DEFAULT '{}',
  ALTER COLUMN demo_video_urls SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'skill_listings'
      AND column_name = 'demo_video_url'
  ) THEN
    EXECUTE $copy$
      UPDATE public.skill_listings
      SET demo_video_urls = ARRAY[demo_video_url]
      WHERE demo_video_url IS NOT NULL
        AND cardinality(demo_video_urls) = 0
    $copy$;
  END IF;
END $$;