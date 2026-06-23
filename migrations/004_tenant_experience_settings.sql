BEGIN;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE tenants
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
  'onboardingCompleted', COALESCE((settings->>'onboardingCompleted')::boolean, false),
  'defaultPageSize', COALESCE(NULLIF(settings->>'defaultPageSize', '')::integer, 10),
  'compactTables', COALESCE((settings->>'compactTables')::boolean, false),
  'dashboardFocus', COALESCE(NULLIF(settings->>'dashboardFocus', ''), 'executivo')
)
WHERE settings IS NULL
   OR settings = '{}'::jsonb
   OR NOT settings ? 'defaultPageSize';

COMMIT;
