-- Enforce ownership isolation for parcelles/vannes at DB level.
-- Safe to run multiple times.

BEGIN;

-- 1) Keep only one profile per email to avoid ambiguous owner resolution.
--    If duplicates exist, keep the oldest id and remap parcelles/vannes.
WITH duplicate_profiles AS (
    SELECT email, MIN(id) AS keep_id, ARRAY_AGG(id) AS all_ids
    FROM profiles
    WHERE email IS NOT NULL AND email <> ''
    GROUP BY email
    HAVING COUNT(*) > 1
),
to_merge AS (
    SELECT dp.email, dp.keep_id, unnest(dp.all_ids) AS profile_id
    FROM duplicate_profiles dp
)
UPDATE parcelle p
SET fk_user = m.keep_id
FROM to_merge m
WHERE p.fk_user = m.profile_id
  AND m.profile_id <> m.keep_id;

WITH duplicate_profiles AS (
    SELECT email, MIN(id) AS keep_id, ARRAY_AGG(id) AS all_ids
    FROM profiles
    WHERE email IS NOT NULL AND email <> ''
    GROUP BY email
    HAVING COUNT(*) > 1
),
to_merge AS (
    SELECT dp.email, dp.keep_id, unnest(dp.all_ids) AS profile_id
    FROM duplicate_profiles dp
)
UPDATE vannes v
SET user_id = m.keep_id
FROM to_merge m
WHERE v.user_id = m.profile_id
  AND m.profile_id <> m.keep_id;

-- 2) Align vanne owner with parcelle owner.
UPDATE vannes v
SET user_id = p.fk_user
FROM parcelle p
WHERE v.parcel_id = p.id
  AND v.user_id <> p.fk_user;

-- 3) Remove orphan records that break FK isolation.
DELETE FROM vannes v
WHERE NOT EXISTS (
    SELECT 1
    FROM parcelle p
    WHERE p.id = v.parcel_id
);

DELETE FROM parcelle p
WHERE NOT EXISTS (
    SELECT 1
    FROM profiles pr
    WHERE pr.id = p.fk_user
);

-- 4) Add unique profile email for deterministic owner mapping.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_profiles_email'
    ) THEN
        ALTER TABLE profiles
            ADD CONSTRAINT uq_profiles_email UNIQUE (email);
    END IF;
END $$;

-- 5) Add ownership-enforcing foreign keys.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_parcelle_profile_user'
    ) THEN
        ALTER TABLE parcelle
            ADD CONSTRAINT fk_parcelle_profile_user
            FOREIGN KEY (fk_user) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_vannes_profile_user'
    ) THEN
        ALTER TABLE vannes
            ADD CONSTRAINT fk_vannes_profile_user
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6) Helpful ownership indexes.
CREATE INDEX IF NOT EXISTS idx_parcelle_fk_user_id ON parcelle(fk_user);
CREATE INDEX IF NOT EXISTS idx_vannes_user_id_owner ON vannes(user_id);

COMMIT;
