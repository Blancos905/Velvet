-- Sponsor per posto (agenda cliente e, in seguito, altri slot).
-- Idempotente. In sviluppo Hibernate ddl-auto=update crea la tabella dall'entità.

CREATE TABLE IF NOT EXISTS placement_sponsors (
  id UUID NOT NULL PRIMARY KEY,
  placement VARCHAR(64) NOT NULL,
  brand_name VARCHAR(80) NOT NULL,
  headline VARCHAR(160) NOT NULL,
  cta_label VARCHAR(40) NOT NULL,
  href VARCHAR(500) NOT NULL,
  image_src TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_placement_sponsors_placement
  ON placement_sponsors (placement, sort_order);
