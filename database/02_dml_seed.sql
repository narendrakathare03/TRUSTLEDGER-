-- Sample data for demonstration. Password hashes are placeholders for SQL-only demos.
-- Real login accounts must be created through the application (bcrypt hashes).
SET search_path TO trustledger, public;

INSERT INTO "user" (username, password_hash, role)
VALUES ('demo_admin', '$2a$10$REPLACE_WITH_APP_GENERATED_BCRYPT_HASH', 'admin'),
       ('demo_user', '$2a$10$REPLACE_WITH_APP_GENERATED_BCRYPT_HASH', 'user')
ON CONFLICT (username) DO NOTHING;

INSERT INTO agent (user_id, agent_name)
SELECT user_id, 'Personal Assistant' FROM "user" WHERE username = 'demo_user'
ON CONFLICT (user_id, agent_name) DO NOTHING;

-- Trigger creates trust_score rows automatically for these facts.
INSERT INTO memory_fact (agent_id, fact_text, source_type)
SELECT a.agent_id, v.fact_text, v.source_type
FROM agent a
JOIN "user" u ON u.user_id = a.user_id
CROSS JOIN (VALUES
 ('The user lives in Bengaluru.', 'user_stated'),
 ('The user prefers Python for scripting.', 'user_stated'),
 ('The user may be interested in machine learning.', 'agent_inferred'),
 ('The user lives in Mysuru.', 'agent_inferred')
) AS v(fact_text, source_type)
WHERE u.username = 'demo_user'
AND NOT EXISTS (
  SELECT 1 FROM memory_fact f WHERE f.agent_id = a.agent_id AND f.fact_text = v.fact_text
);

-- Demonstrate UPDATE and DELETE safely on an explicitly temporary demo row.
UPDATE trust_score ts SET score_value = 0.850, last_updated = CURRENT_TIMESTAMP
FROM memory_fact f WHERE f.fact_id = ts.fact_id AND f.fact_text = 'The user prefers Python for scripting.';

-- Example DELETE is intentionally commented to preserve the demonstration data.
-- DELETE FROM memory_fact WHERE fact_text = 'temporary fact to remove';
