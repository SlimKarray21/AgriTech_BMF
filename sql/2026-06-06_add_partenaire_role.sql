-- Migration: add 'partenaire' to users.role CHECK constraint
-- Run this on any existing database (init-db.sql already updated for fresh installs)

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'user', 'partenaire'));
