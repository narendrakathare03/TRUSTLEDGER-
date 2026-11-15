
'use client';

import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';

type Conflict = {
  conflict_id: number;
  status: string;
  new_fact: string;
  old_fact: string;
  new_source: string;
  old_source: string;
  detected_at: string;
};

type User = {
  username: string;
  role: string;
};

export default function Conflicts() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Conflict[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const response = await fetch('/api/conflicts');

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }

        throw new Error('Unable to load conflicts.');
      }

      const data = await response.json();
      setItems(data.conflicts || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load conflicts.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        const response = await fetch('/api/auth/me');

        if (!response.ok) {
          window.location.href = '/login';
          return;
        }

        const data = await response.json();
        setUser(data.user);

        await load();
      } catch {
        setError('Unable to verify your account.');
        setLoading(false);
      }
    }

    initialize();
  }, []);

  async function resolve(id: number, decision: string) {
    setBusy(id);
    setError('');

    try {
      const response = await fetch('/api/conflicts/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conflictId: id,
          decision,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to resolve conflict.');
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to resolve conflict.'
      );
    } finally {
      setBusy(null);
    }
  }

  const isAdmin = user?.role === 'admin';

  return (
    <>
      {user && <Nav username={user.username} />}

      <main className="page-wrap">
        <div className="page-heading">
          <div>
            <div className="eyebrow">REVIEW QUEUE</div>
            <h1>Conflict inbox</h1>
            <p className="muted">
              Semantically similar memories are shown here for human review.
            </p>
          </div>

          <span className="count-pill">
            {items.filter((item) => item.status === 'pending').length} Pending
          </span>
        </div>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <section className="panel empty">
            <p>Loading conflicts...</p>
          </section>
        ) : items.length === 0 ? (
          <section className="panel empty">
            <h3>All clear</h3>
            <p>No possible conflicts have been detected yet.</p>
          </section>
        ) : (
          items.map((conflict) => (
            <article
              className="panel conflict-card"
              key={conflict.conflict_id}
            >
              <div className="conflict-top">
                <span className="eyebrow">
                  CONFLICT #{conflict.conflict_id}
                </span>

                <span className={`status ${conflict.status}`}>
                  {conflict.status.replace('_', ' ')}
                </span>
              </div>

              <div className="compare-grid">
                <div>
                  <span className="compare-label">
                    NEW MEMORY · {conflict.new_source.replace('_', ' ')}
                  </span>
                  <p>{conflict.new_fact}</p>
                </div>

                <div>
                  <span className="compare-label">
                    EXISTING MEMORY · {conflict.old_source.replace('_', ' ')}
                  </span>
                  <p>{conflict.old_fact}</p>
                </div>
              </div>

              {conflict.status === 'pending' && isAdmin && (
                <div className="decision-row">
                  <button
                    disabled={busy === conflict.conflict_id}
                    className="btn btn-ghost"
                    onClick={() =>
                      resolve(conflict.conflict_id, 'kept_old')
                    }
                  >
                    Keep old
                  </button>

                  <button
                    disabled={busy === conflict.conflict_id}
                    className="btn btn-primary"
                    onClick={() =>
                      resolve(conflict.conflict_id, 'accepted_new')
                    }
                  >
                    Accept new
                  </button>

                  <button
                    disabled={busy === conflict.conflict_id}
                    className="btn btn-ghost"
                    onClick={() =>
                      resolve(conflict.conflict_id, 'both_uncertain')
                    }
                  >
                    Both uncertain
                  </button>
                </div>
              )}

              {conflict.status === 'pending' && !isAdmin && (
                <div className="decision-row">
                  <p className="muted">
                    Waiting for an administrator to review this conflict.
                  </p>
                </div>
              )}
            </article>
          ))
        )}
      </main>
    </>
  );
}
