-- Run after database/01_ddl.sql. This verifies the trigger and view.
SET search_path TO trustledger, public;
BEGIN;
WITH test_user AS (
  INSERT INTO "user"(username,password_hash,role)
  VALUES ('_trustledger_smoke_' || txid_current()::text, 'not-a-login-hash', 'user')
  RETURNING user_id
), test_agent AS (
  INSERT INTO agent(user_id,agent_name)
  SELECT user_id,'Smoke Test Agent' FROM test_user RETURNING agent_id
), test_fact AS (
  INSERT INTO memory_fact(agent_id,fact_text,source_type)
  SELECT agent_id,'Smoke test fact for trigger verification','user_stated' FROM test_agent
  RETURNING fact_id
)
SELECT f.fact_id, ts.score_value
FROM test_fact f JOIN trust_score ts ON ts.fact_id=f.fact_id;
ROLLBACK;
