-- ═══════════════════════════════════════════════════════════════════════════
-- init-db.sql — Base de données piston_control
-- Tables existantes : 18 tables AgriTech + tables MQTT/Auth recréées
-- NOTE: users et profiles supprimés → remplacés par utilisateur
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Table UNIQUE utilisateur (fusion de users + profiles)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisateur (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID      NOT NULL DEFAULT gen_random_uuid(),
    email           TEXT      NOT NULL,
    password_hash   TEXT,
    email_verified  BOOLEAN   NOT NULL DEFAULT FALSE,
    first_name      TEXT      NOT NULL DEFAULT '',
    last_name       TEXT      NOT NULL DEFAULT '',
    avatar_url      TEXT,
    user_role       TEXT      NOT NULL DEFAULT 'CLIENT',
    phone_number    TEXT,
    country         TEXT,
    city            TEXT,
    date_of_birth   DATE,
    date_deb_abo    DATE,
    date_exp_abo    DATE,
    type_abo        TEXT,
    created_by      BIGINT,
    company_name    TEXT,
    company_logo    TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables MQTT / Devices (sans FK vers users — utilisateur.user_id est UUID)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
    id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT      NOT NULL,
    owner_id       UUID      NOT NULL,
    mqtt_client_id TEXT      UNIQUE NOT NULL,
    status         TEXT      CHECK (status IN ('online', 'offline')) DEFAULT 'offline',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NOTE: la table `pistons` a été supprimée. L'état physique d'un canal (1-8)
-- est désormais porté par la table `vannes` (is_open / piston_number / device_id).

CREATE TABLE IF NOT EXISTS telemetry (
    id            BIGSERIAL PRIMARY KEY,
    device_id     UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    piston_number INT CHECK (piston_number >= 1 AND piston_number <= 8),
    event_type    TEXT NOT NULL CHECK (event_type IN ('activated', 'deactivated', 'status_update')),
    payload       JSONB,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
    id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT      NOT NULL,
    device_id       UUID      NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    piston_number   INT       NOT NULL CHECK (piston_number >= 1 AND piston_number <= 8),
    action          TEXT      NOT NULL CHECK (action IN ('ACTIVATE', 'DEACTIVATE')),
    cron_expression TEXT      NOT NULL,
    enabled         BOOLEAN   DEFAULT TRUE,
    user_id         UUID      NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers et fonctions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_utilisateur_updated_at ON utilisateur;
CREATE TRIGGER update_utilisateur_updated_at BEFORE UPDATE ON utilisateur
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedules_updated_at ON schedules;
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- AgriTech tables
-- ─────────────────────────────────────────────────────────────────────────────

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
    id                       BIGSERIAL PRIMARY KEY,
    temperature_c            DOUBLE PRECISION NOT NULL,
    humidite_c               DOUBLE PRECISION NOT NULL,
    vitesse_vent             DOUBLE PRECISION NOT NULL,
    puissance_ensoleillement DOUBLE PRECISION NOT NULL,
    created_at               TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    id                   BIGSERIAL PRIMARY KEY,
    name                 TEXT             NOT NULL,
    type                 TEXT             NOT NULL,
    age                  INTEGER          NOT NULL DEFAULT 1,
    count                INTEGER          NOT NULL DEFAULT 0,
    water_need_per_plant DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    device_id      UUID             REFERENCES devices(id) ON DELETE SET NULL,
    piston_number  INTEGER          CHECK (piston_number BETWEEN 1 AND 8),
    created_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rapport_sol (
    id                     BIGSERIAL PRIMARY KEY,
    report_name            TEXT             NOT NULL,
    parcel_id              BIGINT           NOT NULL REFERENCES parcelle(id) ON DELETE CASCADE,
    user_id                BIGINT           NOT NULL,
    analysis_date          DATE             NOT NULL,
    argile_percent         DOUBLE PRECISION NOT NULL DEFAULT 0,
    limon_percent          DOUBLE PRECISION NOT NULL DEFAULT 0,
    sable_percent          DOUBLE PRECISION NOT NULL DEFAULT 0,
    ph                     DOUBLE PRECISION NOT NULL DEFAULT 7,
    ce_ds_m                DOUBLE PRECISION NOT NULL DEFAULT 0,
    calcaire_total_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
    calcaire_actif_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
    mo_percent             DOUBLE PRECISION NOT NULL DEFAULT 0,
    rapport_cn             DOUBLE PRECISION NOT NULL DEFAULT 0,
    p2o5_ppm               DOUBLE PRECISION NOT NULL DEFAULT 0,
    k2o_ppm                DOUBLE PRECISION NOT NULL DEFAULT 0,
    mgo_ppm                DOUBLE PRECISION NOT NULL DEFAULT 0,
    cec_meq_100g           DOUBLE PRECISION NOT NULL DEFAULT 0,
    esp_percent            DOUBLE PRECISION NOT NULL DEFAULT 0,
    interpretations        TEXT,
    created_at             TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rapport_eau (
    id                 BIGSERIAL PRIMARY KEY,
    report_name        TEXT             NOT NULL,
    parcel_id          BIGINT           NOT NULL REFERENCES parcelle(id) ON DELETE CASCADE,
    user_id            BIGINT           NOT NULL,
    analysis_date      DATE             NOT NULL,
    ph                 DOUBLE PRECISION NOT NULL DEFAULT 7,
    cew_ds_m           DOUBLE PRECISION NOT NULL DEFAULT 0,
    residu_sec_mg_l    DOUBLE PRECISION NOT NULL DEFAULT 0,
    chlorures_meq_l    DOUBLE PRECISION NOT NULL DEFAULT 0,
    sulfates_meq_l     DOUBLE PRECISION NOT NULL DEFAULT 0,
    bicarbonates_meq_l DOUBLE PRECISION NOT NULL DEFAULT 0,
    sodium_meq_l       DOUBLE PRECISION NOT NULL DEFAULT 0,
    calcium_meq_l      DOUBLE PRECISION NOT NULL DEFAULT 0,
    magnesium_meq_l    DOUBLE PRECISION NOT NULL DEFAULT 0,
    sar_ratio          DOUBLE PRECISION NOT NULL DEFAULT 0,
    durete_f           DOUBLE PRECISION NOT NULL DEFAULT 0,
    interpretations    TEXT,
    created_at         TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_utilisateur_email    ON utilisateur(email);
CREATE INDEX IF NOT EXISTS idx_utilisateur_user_id  ON utilisateur(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_owner        ON devices(owner_id);
CREATE INDEX IF NOT EXISTS idx_devices_status       ON devices(status);
CREATE INDEX IF NOT EXISTS idx_telemetry_device     ON telemetry(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_created    ON telemetry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedules_device     ON schedules(device_id);
CREATE INDEX IF NOT EXISTS idx_schedules_enabled    ON schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_parcelle_fk_user     ON parcelle(fk_user);
CREATE INDEX IF NOT EXISTS idx_vannes_parcel_id     ON vannes(parcel_id);
CREATE INDEX IF NOT EXISTS idx_vannes_user_id       ON vannes(user_id);
CREATE INDEX IF NOT EXISTS idx_vannes_device_id     ON vannes(device_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_profile ON subscription_payments(profile_id);
CREATE INDEX IF NOT EXISTS idx_client_sales_profile ON client_sales(profile_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_user    ON reclamations(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Migrations pour bases existantes
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE vannes ADD COLUMN IF NOT EXISTS device_id     UUID;
ALTER TABLE vannes ADD COLUMN IF NOT EXISTS piston_number INTEGER CHECK (piston_number BETWEEN 1 AND 8);

-- Relation vannes.device_id → devices(id) (ajoutée si absente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_vannes_device'
  ) THEN
    ALTER TABLE vannes
      ADD CONSTRAINT fk_vannes_device
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Relations rapport_sol / rapport_eau → parcelle (one-to-many)
-- Nettoyer d'abord les rapports orphelins (parcel_id inexistant) car FK CASCADE
DELETE FROM rapport_sol WHERE parcel_id NOT IN (SELECT id FROM parcelle);
DELETE FROM rapport_eau WHERE parcel_id NOT IN (SELECT id FROM parcelle);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rapport_sol_parcelle') THEN
    ALTER TABLE rapport_sol
      ADD CONSTRAINT fk_rapport_sol_parcelle
      FOREIGN KEY (parcel_id) REFERENCES parcelle(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_rapport_eau_parcelle') THEN
    ALTER TABLE rapport_eau
      ADD CONSTRAINT fk_rapport_eau_parcelle
      FOREIGN KEY (parcel_id) REFERENCES parcelle(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fusion piston → vanne : telemetry référence directement le numéro de canal,
-- puis suppression de la table pistons (état physique porté par vannes).
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS piston_number INT CHECK (piston_number BETWEEN 1 AND 8);
-- Reporter le numéro de piston existant (seulement si l'ancienne table existe encore)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pistons') THEN
    UPDATE telemetry t SET piston_number = p.piston_number
    FROM pistons p WHERE t.piston_id = p.id AND t.piston_number IS NULL;
  END IF;
END $$;
ALTER TABLE telemetry DROP COLUMN IF EXISTS piston_id;
DROP TABLE IF EXISTS pistons CASCADE;

-- Fonctionnalités supprimées
DROP TABLE IF EXISTS subscrip_notif CASCADE;
DROP TABLE IF EXISTS support_notifications CASCADE;
DROP TABLE IF EXISTS device_catalog CASCADE;
DROP TABLE IF EXISTS email_verification_codes CASCADE;
DROP TABLE IF EXISTS type_plante CASCADE;
DROP TABLE IF EXISTS auth_tokens CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Permissions
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO piston_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO piston_user;
