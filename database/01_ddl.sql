-- TrustLedger schema. Run while connected to the existing database named postgres.
-- This script does not drop or modify objects in the public schema.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS trustledger;
SET search_path TO trustledger, public;

CREATE TABLE IF NOT EXISTS "user" (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent (
  agent_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES trustledger."user"(user_id) ON DELETE CASCADE,
  agent_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_agent_user_name UNIQUE (user_id, agent_name)
);

CREATE TABLE IF NOT EXISTS memory_fact (
  fact_id SERIAL PRIMARY KEY,
  agent_id INT NOT NULL REFERENCES trustledger.agent(agent_id) ON DELETE CASCADE,
  fact_text TEXT NOT NULL CHECK (length(trim(fact_text)) BETWEEN 3 AND 2000),
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('user_stated', 'agent_inferred')),
  embedding VECTOR(384),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trust_score (
  score_id SERIAL PRIMARY KEY,
  fact_id INT NOT NULL UNIQUE REFERENCES trustledger.memory_fact(fact_id) ON DELETE CASCADE,
  score_value DECIMAL(4,3) NOT NULL DEFAULT 0.500 CHECK (score_value BETWEEN 0 AND 1),
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conflict (
  conflict_id SERIAL PRIMARY KEY,
  new_fact_id INT NOT NULL REFERENCES trustledger.memory_fact(fact_id) ON DELETE CASCADE,
  old_fact_id INT NOT NULL REFERENCES trustledger.memory_fact(fact_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'kept_old', 'accepted_new', 'both_uncertain')),
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_distinct_facts CHECK (new_fact_id <> old_fact_id),
  CONSTRAINT uq_conflict_pair UNIQUE (new_fact_id, old_fact_id)
);

-- ALTER demonstration: safe additive schema evolution.
ALTER TABLE trustledger.memory_fact
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Indexes for ownership, status filters, and vector nearest-neighbour search.
CREATE INDEX IF NOT EXISTS idx_agent_user ON trustledger.agent(user_id);
CREATE INDEX IF NOT EXISTS idx_fact_agent ON trustledger.memory_fact(agent_id);
CREATE INDEX IF NOT EXISTS idx_conflict_status ON trustledger.conflict(status);
CREATE INDEX IF NOT EXISTS idx_fact_created_at ON trustledger.memory_fact(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_embedding_cosine
  ON trustledger.memory_fact USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Trigger: every new memory receives a default trust score automatically.
CREATE OR REPLACE FUNCTION trustledger.create_initial_trust_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO trustledger.trust_score(fact_id, score_value)
  VALUES (NEW.fact_id, CASE WHEN NEW.source_type = 'user_stated' THEN 0.800 ELSE 0.500 END)
  ON CONFLICT (fact_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_trust_score ON trustledger.memory_fact;
CREATE TRIGGER trg_create_trust_score
AFTER INSERT ON trustledger.memory_fact
FOR EACH ROW EXECUTE FUNCTION trustledger.create_initial_trust_score();

-- Stored procedure: recompute both related trust scores after a conflict decision.
CREATE OR REPLACE PROCEDURE trustledger.resolve_conflict_scores(p_conflict_id INT)
LANGUAGE plpgsql AS $$
DECLARE c trustledger.conflict%ROWTYPE;
BEGIN
  SELECT * INTO c FROM trustledger.conflict WHERE conflict_id = p_conflict_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conflict % not found', p_conflict_id; END IF;
  IF c.status = 'pending' THEN RAISE EXCEPTION 'Resolve the conflict before recalculating scores'; END IF;

  IF c.status = 'kept_old' THEN
    UPDATE trustledger.trust_score SET score_value = 0.900, last_updated = CURRENT_TIMESTAMP WHERE fact_id = c.old_fact_id;
    UPDATE trustledger.trust_score SET score_value = 0.250, last_updated = CURRENT_TIMESTAMP WHERE fact_id = c.new_fact_id;
  ELSIF c.status = 'accepted_new' THEN
    UPDATE trustledger.trust_score SET score_value = 0.900, last_updated = CURRENT_TIMESTAMP WHERE fact_id = c.new_fact_id;
    UPDATE trustledger.trust_score SET score_value = 0.300, last_updated = CURRENT_TIMESTAMP WHERE fact_id = c.old_fact_id;
  ELSIF c.status = 'both_uncertain' THEN
    UPDATE trustledger.trust_score SET score_value = 0.400, last_updated = CURRENT_TIMESTAMP
      WHERE fact_id IN (c.new_fact_id, c.old_fact_id);
  END IF;
END;
$$;

-- View: dashboard-ready facts with ownership and trust information.
CREATE OR REPLACE VIEW trustledger.v_memory_dashboard AS
SELECT f.fact_id, f.fact_text, f.source_type, f.created_at, f.updated_at,
       a.agent_id, a.agent_name, a.user_id, u.username,
       ts.score_value, ts.last_updated AS score_updated_at
FROM trustledger.memory_fact f
JOIN trustledger.agent a ON a.agent_id = f.agent_id
JOIN trustledger."user" u ON u.user_id = a.user_id
LEFT JOIN trustledger.trust_score ts ON ts.fact_id = f.fact_id;

-- Application roles are enforced by the Next.js API using the user.role column.
-- Optional database login roles can be provisioned by a DBA separately.
