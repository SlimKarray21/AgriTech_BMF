-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'user', 'partenaire')) DEFAULT 'user',
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    date_of_birth DATE,
    location TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}'::JSONB,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mqtt_client_id TEXT UNIQUE NOT NULL,
    status TEXT CHECK (status IN ('online', 'offline')) DEFAULT 'offline',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pistons table
CREATE TABLE IF NOT EXISTS pistons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    piston_number INT NOT NULL CHECK (piston_number >= 1 AND piston_number <= 8),
    state TEXT CHECK (state IN ('active', 'inactive')) DEFAULT 'inactive',
    last_triggered TIMESTAMP,
    UNIQUE (device_id, piston_number)
);

-- Telemetry logs
CREATE TABLE IF NOT EXISTS telemetry (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    piston_id UUID REFERENCES pistons(id) ON DELETE CASCADE,
    event_type TEXT CHECK (event_type IN ('activated', 'deactivated', 'status_update')) NOT NULL,
    payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auth tokens (for refresh tokens)
CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schedules table (for scheduled valve operations with Quartz)
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    piston_number INT NOT NULL CHECK (piston_number >= 1 AND piston_number <= 8),
    action TEXT NOT NULL CHECK (action IN ('ACTIVATE', 'DEACTIVATE')),
    cron_expression TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table (for tracking admin actions)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_resource_type TEXT,
    target_resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email verification column
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Migration: mark existing users as verified
UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;

-- Email verification codes (OTP)
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    attempts INT DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON email_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON email_verification_codes(expires_at);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_owner ON devices(owner_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_pistons_device ON pistons(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_device ON telemetry(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_event ON telemetry(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_schedules_device ON schedules(device_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_schedules_created ON schedules(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SECURITY: Default admin user removed for production security
-- To create an admin user, use the /auth/register endpoint
-- Then manually update the role in the database:
-- UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';

-- ─────────────────────────────────────────────────────────────────────────────
-- AgriTech tables (profiles, parcelles, vannes, commerce, stock, support…)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT    NOT NULL,
    first_name      TEXT      NOT NULL,
    last_name       TEXT      NOT NULL,
    avatar_url      TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_role       TEXT      NOT NULL DEFAULT 'CLIENT',
    phone_number    TEXT,
    location        TEXT,
    country         TEXT,
    city            TEXT,
    date_of_birth   DATE,
    date_deb_abo    DATE,
    date_exp_abo    DATE,
    type_abo        TEXT,
    email           TEXT      NOT NULL,
    created_by      BIGINT,
    company_name    TEXT,
    company_logo    TEXT,
    abo_capteur_sol  BOOLEAN   NOT NULL DEFAULT TRUE,
    abo_electrovanne BOOLEAN   NOT NULL DEFAULT FALSE,
    abo_sante_plante BOOLEAN   NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS type_plante (
    id                   BIGSERIAL PRIMARY KEY,
    nom_plante           TEXT             NOT NULL,
    type_plante          TEXT             NOT NULL,
    besoin_eau_par_plante DOUBLE PRECISION NOT NULL,
    created_at           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sol_expo (
    id          BIGSERIAL PRIMARY KEY,
    nature      TEXT             NOT NULL,
    humidite    DOUBLE PRECISION NOT NULL,
    salinite    DOUBLE PRECISION NOT NULL,
    ph          DOUBLE PRECISION NOT NULL,
    temperature DOUBLE PRECISION NOT NULL,
    date_mesure TIMESTAMP        NOT NULL,
    created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS climats_expo (
    id                      BIGSERIAL PRIMARY KEY,
    temperature_c           DOUBLE PRECISION NOT NULL,
    humidite_c              DOUBLE PRECISION NOT NULL,
    vitesse_vent            DOUBLE PRECISION NOT NULL,
    puissance_ensoleillement DOUBLE PRECISION NOT NULL,
    created_at              TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parcelle (
    id           BIGSERIAL PRIMARY KEY,
    nom_surface  TEXT             NOT NULL,
    localisation TEXT             NOT NULL,
    type_sol     TEXT             NOT NULL,
    fk_user      BIGINT           NOT NULL,
    fk_sol       BIGINT,
    fk_climat    BIGINT,
    created_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    taille_ha    DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS plantes (
    id                  BIGSERIAL PRIMARY KEY,
    name                TEXT             NOT NULL,
    type                TEXT             NOT NULL,
    age                 INTEGER          NOT NULL DEFAULT 1,
    count               INTEGER          NOT NULL DEFAULT 0,
    water_need_per_plant DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parcelle_plantes (
    id          BIGSERIAL PRIMARY KEY,
    parcelle_id BIGINT NOT NULL REFERENCES parcelle(id) ON DELETE CASCADE,
    plante_id   BIGINT NOT NULL REFERENCES plantes(id)  ON DELETE CASCADE,
    UNIQUE (parcelle_id, plante_id)
);

CREATE TABLE IF NOT EXISTS vannes (
    id             BIGSERIAL PRIMARY KEY,
    name           TEXT             NOT NULL,
    debit          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    is_auto        BOOLEAN          NOT NULL DEFAULT FALSE,
    is_open        BOOLEAN          NOT NULL DEFAULT FALSE,
    last_action    TEXT,
    nb_plants      INTEGER          NOT NULL DEFAULT 0,
    parcel_id      BIGINT           NOT NULL REFERENCES parcelle(id) ON DELETE CASCADE,
    schedule_days  TEXT,
    schedule_start TEXT,
    schedule_end   TEXT,
    user_id        BIGINT           NOT NULL,
    created_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rapport_sol (
    id                      BIGSERIAL PRIMARY KEY,
    report_name             TEXT             NOT NULL,
    parcel_id               BIGINT           NOT NULL,
    user_id                 BIGINT           NOT NULL,
    analysis_date           DATE             NOT NULL,
    argile_percent          DOUBLE PRECISION NOT NULL DEFAULT 0,
    limon_percent           DOUBLE PRECISION NOT NULL DEFAULT 0,
    sable_percent           DOUBLE PRECISION NOT NULL DEFAULT 0,
    ph                      DOUBLE PRECISION NOT NULL DEFAULT 7,
    ce_ds_m                 DOUBLE PRECISION NOT NULL DEFAULT 0,
    calcaire_total_percent  DOUBLE PRECISION NOT NULL DEFAULT 0,
    calcaire_actif_percent  DOUBLE PRECISION NOT NULL DEFAULT 0,
    mo_percent              DOUBLE PRECISION NOT NULL DEFAULT 0,
    rapport_cn              DOUBLE PRECISION NOT NULL DEFAULT 0,
    p2o5_ppm                DOUBLE PRECISION NOT NULL DEFAULT 0,
    k2o_ppm                 DOUBLE PRECISION NOT NULL DEFAULT 0,
    mgo_ppm                 DOUBLE PRECISION NOT NULL DEFAULT 0,
    cec_meq_100g            DOUBLE PRECISION NOT NULL DEFAULT 0,
    esp_percent             DOUBLE PRECISION NOT NULL DEFAULT 0,
    interpretations         TEXT,
    created_at              TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rapport_eau (
    id                  BIGSERIAL PRIMARY KEY,
    report_name         TEXT             NOT NULL,
    parcel_id           BIGINT           NOT NULL,
    user_id             BIGINT           NOT NULL,
    analysis_date       DATE             NOT NULL,
    ph                  DOUBLE PRECISION NOT NULL DEFAULT 7,
    cew_ds_m            DOUBLE PRECISION NOT NULL DEFAULT 0,
    residu_sec_mg_l     DOUBLE PRECISION NOT NULL DEFAULT 0,
    chlorures_meq_l     DOUBLE PRECISION NOT NULL DEFAULT 0,
    sulfates_meq_l      DOUBLE PRECISION NOT NULL DEFAULT 0,
    bicarbonates_meq_l  DOUBLE PRECISION NOT NULL DEFAULT 0,
    sodium_meq_l        DOUBLE PRECISION NOT NULL DEFAULT 0,
    calcium_meq_l       DOUBLE PRECISION NOT NULL DEFAULT 0,
    magnesium_meq_l     DOUBLE PRECISION NOT NULL DEFAULT 0,
    sar_ratio           DOUBLE PRECISION NOT NULL DEFAULT 0,
    durete_f            DOUBLE PRECISION NOT NULL DEFAULT 0,
    interpretations     TEXT,
    created_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT             NOT NULL,
    price_dt      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    duration_days INTEGER          NOT NULL DEFAULT 30,
    features      TEXT             NOT NULL DEFAULT '[]',
    active        BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscription_payments (
    id             BIGSERIAL PRIMARY KEY,
    profile_id     BIGINT           NOT NULL,
    plan_id        BIGINT           NOT NULL,
    amount_dt      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    payment_method TEXT             NOT NULL DEFAULT 'cash',
    status         TEXT             NOT NULL DEFAULT 'en_attente',
    date_start     DATE,
    date_exp       DATE,
    validated_at   TIMESTAMP,
    validated_by   BIGINT,
    created_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_reservations (
    id                     BIGSERIAL PRIMARY KEY,
    profile_id             BIGINT,
    surface_id             BIGINT,
    subscription_plan_id   BIGINT,
    status                 TEXT             NOT NULL DEFAULT 'pending',
    total_devices_price_dt DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    notes                  TEXT,
    created_by             BIGINT,
    created_at             TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client_sales (
    id                    BIGSERIAL PRIMARY KEY,
    profile_id            BIGINT           NOT NULL,
    subscription_plan_id  BIGINT,
    reservation_id        BIGINT,
    subscription_price_dt DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    equipment_price_dt    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_dt              DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    payment_method        TEXT             NOT NULL DEFAULT 'cash',
    status                TEXT             NOT NULL DEFAULT 'pending',
    confirmed_by          BIGINT,
    confirmed_at          TIMESTAMP,
    created_at            TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_catalog (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT             NOT NULL,
    device_type     TEXT             NOT NULL,
    price_dt        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    stock           INTEGER          NOT NULL DEFAULT 0,
    available       BOOLEAN          NOT NULL DEFAULT TRUE,
    connected_state TEXT             NOT NULL DEFAULT 'disconnected',
    info            TEXT,
    created_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_sales (
    id               BIGSERIAL PRIMARY KEY,
    buyer_profile_id BIGINT           NOT NULL,
    device_id        BIGINT           NOT NULL,
    quantity         INTEGER          NOT NULL DEFAULT 1,
    unit_price_dt    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_dt         DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    payment_method   TEXT             NOT NULL DEFAULT 'cash',
    status           TEXT             NOT NULL DEFAULT 'pending',
    validated_at     TIMESTAMP,
    validated_by     BIGINT,
    created_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_items (
    id                  BIGSERIAL PRIMARY KEY,
    name                TEXT             NOT NULL,
    category            TEXT             NOT NULL DEFAULT 'general',
    quantity            INTEGER          NOT NULL DEFAULT 0,
    purchase_price_dt   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    low_stock_threshold INTEGER          NOT NULL DEFAULT 5,
    features            TEXT,
    created_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id             BIGSERIAL PRIMARY KEY,
    stock_item_id  BIGINT    NOT NULL,
    movement_type  TEXT      NOT NULL DEFAULT 'out',
    quantity       INTEGER   NOT NULL DEFAULT 0,
    reason         TEXT,
    reservation_id BIGINT,
    created_by     BIGINT,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservation_items (
    id             BIGSERIAL PRIMARY KEY,
    reservation_id BIGINT           NOT NULL,
    stock_item_id  BIGINT           NOT NULL,
    quantity       INTEGER          NOT NULL DEFAULT 1,
    unit_price_dt  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reclamations (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT    NOT NULL,
    profile_id BIGINT,
    sujet      TEXT      NOT NULL,
    message    TEXT      NOT NULL,
    statut     TEXT      NOT NULL DEFAULT 'ouvert',
    traite_by  BIGINT,
    traite_at  TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_notifications (
    id               BIGSERIAL PRIMARY KEY,
    title            TEXT      NOT NULL,
    message          TEXT,
    notif_type       TEXT      NOT NULL DEFAULT 'info',
    is_read          BOOLEAN   NOT NULL DEFAULT FALSE,
    link             TEXT,
    created_for_role TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscrip_notif (
    id             BIGSERIAL PRIMARY KEY,
    client_email   TEXT      NOT NULL,
    client_name    TEXT      NOT NULL,
    days_remaining INTEGER   NOT NULL,
    sent_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AgriTech indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email          ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_parcelle_fk_user        ON parcelle(fk_user);
CREATE INDEX IF NOT EXISTS idx_vannes_parcel_id        ON vannes(parcel_id);
CREATE INDEX IF NOT EXISTS idx_vannes_user_id          ON vannes(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_profile    ON subscription_payments(profile_id);
CREATE INDEX IF NOT EXISTS idx_client_sales_profile    ON client_sales(profile_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item    ON stock_movements(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_user       ON reclamations(user_id);

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO piston_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO piston_user;
