SET search_path TO trustledger, public;

-- Advanced concept 1: Trigger (defined in 01_ddl.sql)
-- Verify automatic trust score creation:
SELECT f.fact_id, f.fact_text, ts.score_value
FROM memory_fact f LEFT JOIN trust_score ts ON ts.fact_id = f.fact_id
ORDER BY f.fact_id DESC;

-- Advanced concept 2: Stored procedure (resolve a conflict first, then call)
-- UPDATE conflict SET status = 'accepted_new' WHERE conflict_id = 1;
-- CALL resolve_conflict_scores(1);

-- Advanced concept 3: Transaction (all changes commit or roll back together)
BEGIN;
  UPDATE trust_score SET score_value = 0.650, last_updated = CURRENT_TIMESTAMP
  WHERE fact_id = (SELECT MIN(fact_id) FROM memory_fact);
  -- Inspect the change before committing.
  SELECT * FROM trust_score ORDER BY score_id;
ROLLBACK; -- Change to COMMIT when you want to retain the demonstration update.

-- Advanced concept 4: Views and indexing
SELECT * FROM v_memory_dashboard;
EXPLAIN ANALYZE SELECT * FROM memory_fact WHERE agent_id = 1 ORDER BY created_at DESC;
