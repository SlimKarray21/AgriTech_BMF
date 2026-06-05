-- Migration: AgriTech Commerce & Stock tables
-- Run this on any existing DB that has the base tables but not the commerce tables.
-- Safe to run multiple times (IF NOT EXISTS everywhere).

-- 1) Add missing columns to profiles (abo_* flags)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS abo_capteur_sol  BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS abo_electrovanne BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS abo_sante_plante BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    price_dt      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    duration_days INTEGER          NOT NULL DEFAULT 30,
    features      TEXT             NOT NULL DEFAULT '{}',
    active        BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3) Subscription payments
CREATE TABLE IF NOT EXISTS subscription_payments (
    id             BIGSERIAL PRIMARY KEY,
    profile_id     BIGINT           NOT NULL,
    plan_id        BIGINT           NOT NULL,
    amount_dt      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    payment_method TEXT             NOT NULL DEFAULT 'cash',
    status         TEXT             NOT NULL DEFAULT 'pending',
    date_start     DATE,
    date_exp       DATE,
    validated_at   TIMESTAMP,
    validated_by   BIGINT,
    created_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4) Material reservations
CREATE TABLE IF NOT EXISTS material_reservations (
    id                    BIGSERIAL PRIMARY KEY,
    profile_id            BIGINT,
    surface_id            BIGINT,
    subscription_plan_id  BIGINT,
    status                TEXT             NOT NULL DEFAULT 'pending',
    total_devices_price_dt DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    notes                 TEXT,
    created_by            BIGINT,
    created_at            TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5) Client sales
CREATE TABLE IF NOT EXISTS client_sales (
    id                   BIGSERIAL PRIMARY KEY,
    profile_id           BIGINT           NOT NULL,
    subscription_plan_id BIGINT,
    reservation_id       BIGINT,
    subscription_price_dt DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    equipment_price_dt   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_dt             DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    payment_method       TEXT             NOT NULL DEFAULT 'cash',
    status               TEXT             NOT NULL DEFAULT 'pending',
    confirmed_by         BIGINT,
    confirmed_at         TIMESTAMP,
    created_at           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6) Device catalog
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

-- 7) Device sales
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

-- 8) Stock items
CREATE TABLE IF NOT EXISTS stock_items (
    id                 BIGSERIAL PRIMARY KEY,
    name               TEXT             NOT NULL,
    category           TEXT             NOT NULL DEFAULT 'general',
    quantity           INTEGER          NOT NULL DEFAULT 0,
    purchase_price_dt  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    low_stock_threshold INTEGER         NOT NULL DEFAULT 5,
    features           TEXT,
    created_at         TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9) Stock movements
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

-- 10) Reservation items
CREATE TABLE IF NOT EXISTS reservation_items (
    id             BIGSERIAL PRIMARY KEY,
    reservation_id BIGINT           NOT NULL,
    stock_item_id  BIGINT           NOT NULL,
    quantity       INTEGER          NOT NULL DEFAULT 1,
    unit_price_dt  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11) Reclamations
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

-- 12) Support notifications
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_payments_profile ON subscription_payments(profile_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_plan    ON subscription_payments(plan_id);
CREATE INDEX IF NOT EXISTS idx_client_sales_profile          ON client_sales(profile_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item          ON stock_movements(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_reclamations_user             ON reclamations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_notif_read            ON support_notifications(is_read);
