-- Fix profiles.user_id: convert from BIGINT to TEXT (UUID)
-- Join with users table by email to get the correct UUID

-- Step 1: add a temporary UUID column
ALTER TABLE profiles ADD COLUMN user_id_uuid TEXT;

-- Step 2: populate it by matching email between profiles and users
UPDATE profiles p
SET user_id_uuid = u.id::TEXT
FROM users u
WHERE lower(u.email) = lower(p.email);

-- Step 3: drop old BIGINT column, rename new TEXT column
ALTER TABLE profiles DROP COLUMN user_id;
ALTER TABLE profiles RENAME COLUMN user_id_uuid TO user_id;

-- Step 4: add NOT NULL constraint (only if all rows were matched)
-- Run this only after verifying: SELECT COUNT(*) FROM profiles WHERE user_id IS NULL;
-- ALTER TABLE profiles ALTER COLUMN user_id SET NOT NULL;
