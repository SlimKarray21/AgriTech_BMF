-- Tables required by mobile wizard form (parcelle/plantes/type_plante/vannes flow)

CREATE TABLE IF NOT EXISTS plantes (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    age INTEGER NOT NULL DEFAULT 1,
    count INTEGER NOT NULL DEFAULT 0,
    water_need_per_plant DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parcelle_plantes (
    id BIGSERIAL PRIMARY KEY,
    parcelle_id BIGINT NOT NULL REFERENCES parcelle(id) ON DELETE CASCADE,
    plante_id BIGINT NOT NULL REFERENCES plantes(id) ON DELETE CASCADE,
    UNIQUE (parcelle_id, plante_id)
);

CREATE INDEX IF NOT EXISTS idx_plantes_type ON plantes(type);
CREATE INDEX IF NOT EXISTS idx_parcelle_plantes_parcelle ON parcelle_plantes(parcelle_id);
CREATE INDEX IF NOT EXISTS idx_parcelle_plantes_plante ON parcelle_plantes(plante_id);
