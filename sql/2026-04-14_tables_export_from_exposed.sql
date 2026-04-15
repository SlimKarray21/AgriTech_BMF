-- Export SQL generated from com.pistoncontrol.database.Tables.kt
-- Applies CapteurSol-integrated tables + vannes into PostgreSQL.

CREATE TABLE IF NOT EXISTS rapport_sol (
    id BIGSERIAL PRIMARY KEY,
    report_name TEXT NOT NULL,
    parcel_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    analysis_date DATE NOT NULL,
    argile_percent DOUBLE PRECISION NOT NULL,
    limon_percent DOUBLE PRECISION NOT NULL,
    sable_percent DOUBLE PRECISION NOT NULL,
    ph DOUBLE PRECISION NOT NULL,
    ce_ds_m DOUBLE PRECISION NOT NULL,
    calcaire_total_percent DOUBLE PRECISION NOT NULL,
    calcaire_actif_percent DOUBLE PRECISION NOT NULL,
    mo_percent DOUBLE PRECISION NOT NULL,
    rapport_cn DOUBLE PRECISION NOT NULL,
    p2o5_ppm DOUBLE PRECISION NOT NULL,
    k2o_ppm DOUBLE PRECISION NOT NULL,
    mgo_ppm DOUBLE PRECISION NOT NULL,
    cec_meq_100g DOUBLE PRECISION NOT NULL,
    esp_percent DOUBLE PRECISION NOT NULL,
    interpretations TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rapport_eau (
    id BIGSERIAL PRIMARY KEY,
    report_name TEXT NOT NULL,
    parcel_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    analysis_date DATE NOT NULL,
    ph DOUBLE PRECISION NOT NULL,
    cew_ds_m DOUBLE PRECISION NOT NULL,
    residu_sec_mg_l DOUBLE PRECISION NOT NULL,
    chlorures_meq_l DOUBLE PRECISION NOT NULL,
    sulfates_meq_l DOUBLE PRECISION NOT NULL,
    bicarbonates_meq_l DOUBLE PRECISION NOT NULL,
    sodium_meq_l DOUBLE PRECISION NOT NULL,
    calcium_meq_l DOUBLE PRECISION NOT NULL,
    magnesium_meq_l DOUBLE PRECISION NOT NULL,
    sar_ratio DOUBLE PRECISION NOT NULL,
    durete_f DOUBLE PRECISION NOT NULL,
    interpretations TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rapport_files (
    id BIGSERIAL PRIMARY KEY,
    report_type TEXT NOT NULL,
    report_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS type_plante (
    id BIGSERIAL PRIMARY KEY,
    nom_plante TEXT NOT NULL,
    type_plante TEXT NOT NULL,
    besoin_eau_par_plante DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parcelle (
    id BIGSERIAL PRIMARY KEY,
    nom_surface TEXT NOT NULL,
    localisation TEXT NOT NULL,
    type_sol TEXT NOT NULL,
    fk_user BIGINT NOT NULL,
    fk_sol BIGINT,
    fk_climat BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    taille_ha DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS sol_expo (
    id BIGSERIAL PRIMARY KEY,
    nature TEXT NOT NULL,
    humidite DOUBLE PRECISION NOT NULL,
    salinite DOUBLE PRECISION NOT NULL,
    ph DOUBLE PRECISION NOT NULL,
    temperature DOUBLE PRECISION NOT NULL,
    date_mesure TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS climats_expo (
    id BIGSERIAL PRIMARY KEY,
    temperature_c DOUBLE PRECISION NOT NULL,
    humidite_c DOUBLE PRECISION NOT NULL,
    vitesse_vent DOUBLE PRECISION NOT NULL,
    puissance_ensoleillement DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_role TEXT NOT NULL,
    phone_number TEXT,
    location TEXT,
    country TEXT,
    city TEXT,
    date_of_birth DATE,
    date_deb_abo DATE,
    date_exp_abo DATE,
    type_abo TEXT,
    email TEXT NOT NULL,
    created_by BIGINT,
    company_name TEXT,
    company_logo TEXT
);

CREATE TABLE IF NOT EXISTS subscrip_notif (
    id BIGSERIAL PRIMARY KEY,
    client_email TEXT NOT NULL,
    client_name TEXT NOT NULL,
    days_remaining INTEGER NOT NULL,
    sent_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vannes (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    debit DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    is_auto BOOLEAN NOT NULL DEFAULT FALSE,
    is_open BOOLEAN NOT NULL DEFAULT FALSE,
    last_action TEXT,
    name TEXT NOT NULL,
    nb_plants INTEGER NOT NULL DEFAULT 0,
    parcel_id BIGINT NOT NULL,
    schedule_days TEXT,
    schedule_end TEXT,
    schedule_start TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id BIGINT NOT NULL,
    CONSTRAINT vannes_parcel_id_fkey FOREIGN KEY (parcel_id) REFERENCES parcelle(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_parcelle_fk_user ON parcelle(fk_user);
CREATE INDEX IF NOT EXISTS idx_vannes_user_id ON vannes(user_id);
CREATE INDEX IF NOT EXISTS idx_vannes_parcel_id ON vannes(parcel_id);
