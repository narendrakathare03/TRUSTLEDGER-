# TrustLedger

### Trust-Scored Memory Store for AI Agents

TrustLedger is a web-based memory management system designed to help AI agents store, organize and manage information about users. It assigns trust scores to stored memory facts and identifies potentially conflicting information using semantic similarity.

The system uses PostgreSQL and pgvector for database management and vector similarity search, with a Next.js-based web application for user interaction.

---

## Project Overview

AI agents may store information about users across multiple interactions. Over time, this information can become outdated, duplicated or inconsistent.

TrustLedger addresses this problem by providing a structured memory store where:

- Each memory fact is associated with a user and an agent.
- Every memory fact has an associated trust score.
- Text embeddings are used to identify semantically similar memories.
- Potential conflicts are stored for review.
- Administrators can review and resolve conflicts.

## Key Features

- **User Authentication:** User registration and login.
- **Agent-Based Memory:** Organizes memory facts under individual agents.
- **Memory Management:** Add and view stored memory facts.
- **Trust Score Management:** Assigns initial trust scores based on the source of a memory.
- **Semantic Similarity Search:** Uses pgvector and text embeddings to identify similar memories.
- **Conflict Detection:** Identifies potentially conflicting memory facts.
- **Conflict Management:** Displays pending conflicts for review.
- **Administrator Approval:** Allows authorized administrators to resolve conflicts.
- **Dashboard:** Displays memory records, trust scores and conflict statistics.

## Technology Stack

| Component            | Technology         |
| -------------------- | ------------------ |
| Frontend             | Next.js 14, React  |
| Programming Language | TypeScript         |
| Backend              | Next.js API Routes |
| Database             | PostgreSQL 18      |
| Vector Extension     | pgvector 0.8.7     |
| Embedding Model      | all-MiniLM-L6-v2   |
| Authentication       | JWT and bcrypt     |
| Validation           | Zod                |

## Database Design

The project uses a dedicated PostgreSQL schema named `trustledger`.

### Database Tables

| Table         | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `user`        | Stores user account information and roles                    |
| `agent`       | Stores agents associated with users                          |
| `memory_fact` | Stores memory text, source type and embeddings               |
| `trust_score` | Stores trust scores associated with memory facts             |
| `conflict`    | Stores potentially conflicting memory pairs and their status |

### Database Concepts Implemented

- Primary Keys and Foreign Keys
- UNIQUE, NOT NULL and CHECK constraints
- DDL and DML operations
- INSERT, UPDATE and DELETE statements
- INNER JOIN
- GROUP BY and Aggregate Functions
- Nested Subqueries
- Correlated Subqueries
- Common Table Expressions (CTE)
- Transactions and ROLLBACK
- Database Indexes
- Stored Procedures
- Functions and Triggers
- Vector Similarity Search

## Trust Score Mechanism

TrustLedger assigns an initial trust score according to the source of the memory.

| Memory Source  | Initial Trust Score |
| -------------- | ------------------: |
| User-stated    |               0.800 |
| Agent-inferred |               0.500 |

A PostgreSQL trigger automatically creates the initial trust-score record whenever a new memory fact is inserted.

### Conflict Resolution

The project supports three conflict-resolution options:

| Resolution     | New Fact Score | Old Fact Score |
| -------------- | -------------: | -------------: |
| Keep Old       |          0.250 |          0.900 |
| Accept New     |          0.900 |          0.300 |
| Both Uncertain |          0.400 |          0.400 |

The stored procedure `resolve_conflict_scores()` updates the corresponding trust scores after conflict resolution.

## Application Screenshots

The following screenshots demonstrate the main application interfaces and workflows.

### 1. Home Page



### 2. Login Page



### 3. Registration Page



### 4. Dashboard



### 5. Memory Facts



### 6. Add Memory



### 7. Conflict Management



### 8. Pending Conflict View



### 9. Administrator Conflict Approval



### 10. Conflict After Approval



## Project Structure

```text
trustledger/
│
├── database/
│   ├── 01_ddl.sql
│   ├── 02_dml_seed.sql
│   ├── 03_queries.sql
│   ├── 04_advanced_features.sql
│   └── 05_vector_search.sql
│
├── docs/
│   └── screenshots/
│       ├── home.png
│       ├── login.png
│       ├── register.png
│       ├── dashboard.png
│       ├── memory-facts.png
│       ├── add-memory.png
│       ├── conflict-inbox.png
│       ├── pending-conflict.png
│       ├── admin-approval.png
│       └── conflict-approved.png
│
├── src/
│   ├── app/
│   │   └── api/
│   └── lib/
│
├── tests/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Installation and Setup

### Prerequisites

Install the following software:

- Node.js 20 or later
- npm
- PostgreSQL 18
- pgvector extension

### 1. Clone the Repository

```bash
git clone https://github.com/narendrakathare03/TRUSTLEDGER-.git
cd TRUSTLEDGER-/trustledger
```

### 2. Configure the Database

Create or select your PostgreSQL database.

Make sure the pgvector extension is installed and available.

Execute the SQL files from the `database` folder in the following order:

```text
01_ddl.sql
02_dml_seed.sql
03_queries.sql
04_advanced_features.sql
05_vector_search.sql
```

### 3. Configure Environment Variables

Create a local environment file using the example file:

```bash
copy .env.example .env.local
```

Configure the required environment variables in `.env.local`:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secure_secret
```

Use your own database credentials and a secure JWT secret. Do not upload `.env.local` to GitHub.

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Application

```bash
npm run dev
```

Open the application in your browser:

```text
http://localhost:3000
```

### 6. Type Checking

```bash
npm run typecheck
```

## API Routes

The application uses Next.js API routes to communicate with the PostgreSQL database.

| HTTP Method | API Endpoint             | Purpose                               |
| ----------- | ------------------------ | ------------------------------------- |
| GET         | `/api/memories`          | Retrieve memory facts                 |
| POST        | `/api/memories`          | Add a new memory fact                 |
| GET         | `/api/conflicts`         | Retrieve conflict records             |
| POST        | `/api/conflicts/resolve` | Submit a conflict-resolution decision |

##
