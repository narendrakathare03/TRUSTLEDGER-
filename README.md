# TrustLedger — Trust-Scored Memory Store for AI Agents

A DBMS Level 3 mini-project built with Next.js, PostgreSQL and pgvector. It records memory provenance, maintains a trust score for each fact, detects semantically similar memories and lets a human resolve possible conflicts.

## Technology
- Frontend/API: Next.js 14 App Router, React, TypeScript
- Relational database: PostgreSQL (uses the existing database named `postgres`)
- Vector search: pgvector, cosine distance (`<=>`)
- Embeddings: `Xenova/all-MiniLM-L6-v2` through Transformers.js (384 dimensions)
- Authentication: bcrypt password hashes + signed HTTP-only JWT cookie

## Important database safety
The SQL creates a dedicated `trustledger` schema inside the existing `postgres` database. It does not drop or modify objects in the `public` schema. Run the SQL scripts in order. Do not run the original report's DROP statements against a shared database.

## Prerequisites
1. Node.js 20 LTS or newer and npm.
2. PostgreSQL 15+ running locally.
3. pgvector installed for the same PostgreSQL installation. The extension must be available before `CREATE EXTENSION vector` can succeed.
4. pgAdmin 4 or `psql`.

### Install pgvector on Windows
The PostgreSQL installer does not always include pgvector. Install a pgvector build compatible with your exact PostgreSQL major version and architecture, or use a PostgreSQL distribution that bundles pgvector. Then restart PostgreSQL. In pgAdmin, check **postgres → Extensions** or run `SELECT name FROM pg_available_extensions WHERE name='vector';`. If no row appears, pgvector is not installed yet; the SQL cannot enable an extension that is absent from the server.

## Database setup
1. Open pgAdmin and connect to your local PostgreSQL 18 server.
2. Select the existing database named **postgres** and open Query Tool.
3. Run these files in order, one at a time:
   - `database/01_ddl.sql`
   - `database/02_dml_seed.sql` (optional sample records; login accounts should be created through the app)
   - `database/03_queries.sql` (demonstrates DML, joins, grouping, having, ordering, aggregates, subquery and view)
   - `database/04_advanced_features.sql`
   - `database/05_vector_search.sql`
4. Confirm tables under `postgres → Schemas → trustledger → Tables`.

The seed SQL creates demo user records with placeholder password hashes for database demonstrations only. Do not log in with these records. Create real accounts through the registration page.

## Run the web application
1. Open a terminal in this project folder.
2. Install packages:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local`.
4. Edit `.env.local` and set the PostgreSQL password in `DATABASE_URL`. Replace `JWT_SECRET` with a random secret of at least 32 characters. Do not commit `.env.local`.
5. Start the app:
   ```bash
   npm run dev
   ```
6. Open http://localhost:3000 and register a user.

The embedding model downloads on first use and may take a few minutes. The first memory submission can therefore be slower than later submissions.

## Admin role
New registrations are assigned the `user` role. To promote a trusted account to admin, run this in pgAdmin (replace the username):
```sql
UPDATE trustledger."user" SET role='admin' WHERE username='your_username';
```
The application checks roles on API requests. Admin users can view all users' memory/conflict records; regular users see only their own agent's records.

## Main features
- Register/login/logout with bcrypt password hashing and HTTP-only session cookie.
- Add memory facts with `user_stated` or `agent_inferred` provenance.
- Trigger creates a trust-score row automatically (0.800 for user-stated, 0.500 for inferred).
- 384-dimensional embeddings stored in `memory_fact.embedding`.
- Cosine similarity search finds close facts; results are flagged as **possible conflicts**, not automatically declared contradictions.
- Conflict inbox supports Keep old / Accept new / Both uncertain.
- Stored procedure recalculates both trust scores after a resolution.
- Transaction wraps fact insert, candidate search and conflict creation atomically.
- Dashboard view, indexes, validation constraints and parameterized queries.

## SQL concepts mapped to requirements
| Faculty requirement | Implementation |
|---|---|
| CREATE / ALTER / DROP | CREATE TABLE/SCHEMA/INDEX/VIEW/FUNCTION/PROCEDURE; ALTER TABLE; DROP TRIGGER IF EXISTS in `01_ddl.sql`. A DROP TABLE demonstration is intentionally not run against the shared database; see below. |
| PK, FK, constraints | `01_ddl.sql` |
| INSERT / UPDATE / DELETE / SELECT | `02_dml_seed.sql`, `03_queries.sql`, application API |
| JOIN / GROUP BY / HAVING / ORDER BY / aggregates / subquery | `03_queries.sql` |
| Trigger | `create_initial_trust_score` |
| Stored procedure | `resolve_conflict_scores` |
| Transactions | API fact creation and conflict resolution; SQL demo in `04_advanced_features.sql` |
| Views / indexing | `v_memory_dashboard`, indexes in `01_ddl.sql` |
| Vector similarity | pgvector cosine distance in memory API and `05_vector_search.sql` |
| Two roles | `admin` and `user` in user table and API authorization |

### DROP statement demonstration
Because this project uses a shared `postgres` database, the setup deliberately avoids dropping project tables. To demonstrate DROP for evaluation, use a disposable test object:
```sql
CREATE TABLE trustledger.drop_demo (id INT);
DROP TABLE trustledger.drop_demo;
```

## Testing checklist
- [ ] Register a new account and verify a bcrypt hash is stored (not the raw password).
- [ ] Log in with correct and incorrect credentials.
- [ ] Add a user-stated fact; verify the trigger creates a trust score of 0.800.
- [ ] Add an agent-inferred fact; verify initial trust score 0.500.
- [ ] Add a semantically similar contradictory candidate and verify a pending conflict appears.
- [ ] Resolve each decision and verify the stored procedure updates scores.
- [ ] Verify one user cannot read another user's facts by changing API requests.
- [ ] Verify admin can see all agents' facts.
- [ ] Run `npm run typecheck` and `npm run build`.

## Notes / limitations
- Embedding similarity finds semantically close facts; it cannot reliably prove logical contradiction. The interface intentionally calls them possible conflicts and requires a human decision.
- pgvector's `ivfflat` index is created for the required vector indexing demonstration. For very small datasets PostgreSQL may prefer a sequential scan; this is normal.
- `database/02_dml_seed.sql` sample accounts use placeholder hashes and are not usable for app login. Register through the app instead.
- The app expects the SQL schema to have been installed before it starts. It does not automatically run DDL migrations.

## Suggested team contribution record
- Member 1: initial problem definition, ER diagram, relational schema and initial DDL (as documented in the submitted design report).
- Member 2: application/API implementation, DML and analytical queries, vector embedding workflow, integration and application testing.
- Both members should review and commit changes they actually made. Adjust this section to match real contributions; do not claim work that was not performed.
