-- Alert login da nuovo dispositivo / browser (fingerprint User-Agent).
CREATE TABLE IF NOT EXISTS login_device_fingerprints (
  id UUID NOT NULL PRIMARY KEY,
  profile_id UUID NOT NULL,
  fingerprint_hash VARCHAR(64) NOT NULL,
  user_agent_summary VARCHAR(256),
  last_ip VARCHAR(64),
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uk_login_device_fp_profile_hash UNIQUE (profile_id, fingerprint_hash)
);

CREATE INDEX IF NOT EXISTS idx_login_device_fp_profile
  ON login_device_fingerprints (profile_id);
