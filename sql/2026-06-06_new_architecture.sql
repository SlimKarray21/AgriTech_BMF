-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: nouvelle architecture users / profiles
-- ─────────────────────────────────────────────────────────────────────────────

-- STEP 1 : normaliser user_role dans profiles avant d'ajouter le CHECK
UPDATE profiles SET user_role = 'ADMIN'     WHERE lower(user_role) IN ('admin');
UPDATE profiles SET user_role = 'PARTENAIRE' WHERE lower(user_role) IN ('partenaire');
UPDATE profiles SET user_role = 'CLIENT'    WHERE user_role NOT IN ('ADMIN', 'PARTENAIRE', 'CLIENT');

-- STEP 2 : normaliser type_abo (anciens valeurs op1/op1_op2/full → BASIC/PRO/PREMIUM)
UPDATE profiles SET type_abo = 'BASIC'   WHERE type_abo IN ('op1', 'basic');
UPDATE profiles SET type_abo = 'PRO'     WHERE type_abo IN ('op1_op2', 'pro');
UPDATE profiles SET type_abo = 'PREMIUM' WHERE type_abo IN ('full', 'premium');
UPDATE profiles SET type_abo = NULL      WHERE type_abo NOT IN ('BASIC', 'PRO', 'PREMIUM');

-- STEP 3 : supprimer les profils sans user_id (données orphelines)
DELETE FROM profiles WHERE user_id IS NULL;

-- STEP 4 : convertir profiles.user_id TEXT → UUID + contraintes
ALTER TABLE profiles ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE profiles ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS profiles_user_id_unique UNIQUE (user_id);
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS profiles_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- STEP 5 : supprimer colonnes obsolètes de users
ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE users DROP COLUMN IF EXISTS phone_number;
ALTER TABLE users DROP COLUMN IF EXISTS date_of_birth;
ALTER TABLE users DROP COLUMN IF EXISTS location;
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE users DROP COLUMN IF EXISTS preferences;

-- STEP 6 : rendre first_name / last_name NOT NULL dans users
UPDATE users SET first_name = '' WHERE first_name IS NULL;
UPDATE users SET last_name  = '' WHERE last_name  IS NULL;
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name  SET NOT NULL;

-- STEP 7 : supprimer colonnes obsolètes de profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS location;
ALTER TABLE profiles DROP COLUMN IF EXISTS abo_capteur_sol;
ALTER TABLE profiles DROP COLUMN IF EXISTS abo_electrovanne;
ALTER TABLE profiles DROP COLUMN IF EXISTS abo_sante_plante;

-- STEP 8 : ajouter les CHECK constraints sur profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_role_check
    CHECK (user_role IN ('ADMIN', 'PARTENAIRE', 'CLIENT'));

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_type_abo_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_type_abo_check
    CHECK (type_abo IS NULL OR type_abo IN ('BASIC', 'PRO', 'PREMIUM'));

-- STEP 9 : index de performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id    ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_role  ON profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON profiles(created_by);

-- Vérification finale
SELECT
    (SELECT COUNT(*) FROM users)    AS users_count,
    (SELECT COUNT(*) FROM profiles) AS profiles_count,
    (SELECT COUNT(*) FROM profiles WHERE user_role = 'ADMIN')      AS admins,
    (SELECT COUNT(*) FROM profiles WHERE user_role = 'PARTENAIRE') AS partenaires,
    (SELECT COUNT(*) FROM profiles WHERE user_role = 'CLIENT')     AS clients;
