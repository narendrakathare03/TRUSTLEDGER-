SET search_path TO trustledger, public;

-- 1. SELECT + ORDER BY
SELECT fact_id, fact_text, source_type, created_at
FROM memory_fact ORDER BY created_at DESC;

-- 2. JOIN: facts, agent, owner and trust score
SELECT u.username, a.agent_name, f.fact_text, f.source_type, ts.score_value
FROM memory_fact f
JOIN agent a ON a.agent_id = f.agent_id
JOIN "user" u ON u.user_id = a.user_id
JOIN trust_score ts ON ts.fact_id = f.fact_id
ORDER BY ts.score_value DESC;

-- 3. GROUP BY + aggregate functions
SELECT source_type, COUNT(*) AS fact_count, ROUND(AVG(ts.score_value), 3) AS average_trust
FROM memory_fact f JOIN trust_score ts ON ts.fact_id = f.fact_id
GROUP BY source_type;

-- 4. HAVING: agents with at least two facts
SELECT a.agent_name, COUNT(f.fact_id) AS total_facts
FROM agent a LEFT JOIN memory_fact f ON f.agent_id = a.agent_id
GROUP BY a.agent_id, a.agent_name
HAVING COUNT(f.fact_id) >= 2;

-- 5. Subquery: facts whose trust score is above the overall average
SELECT f.fact_id, f.fact_text
FROM memory_fact f JOIN trust_score ts ON ts.fact_id = f.fact_id
WHERE ts.score_value > (SELECT AVG(score_value) FROM trust_score);

-- 6. Conflict inbox
SELECT c.conflict_id, nf.fact_text AS new_fact, of.fact_text AS old_fact,
       c.status, c.detected_at
FROM conflict c
JOIN memory_fact nf ON nf.fact_id = c.new_fact_id
JOIN memory_fact of ON of.fact_id = c.old_fact_id
WHERE c.status = 'pending' ORDER BY c.detected_at DESC;

-- 7. UPDATE example (change only the selected fact)
UPDATE trust_score SET score_value = 0.700, last_updated = CURRENT_TIMESTAMP
WHERE fact_id = (SELECT fact_id FROM memory_fact WHERE fact_text = 'The user may be interested in machine learning.' LIMIT 1);

-- 8. DELETE example: safe demonstration; deletes only a specifically named demo row.
DELETE FROM memory_fact WHERE fact_text = '__DELETE_DEMO__';

-- 9. View query
SELECT * FROM v_memory_dashboard ORDER BY created_at DESC;
