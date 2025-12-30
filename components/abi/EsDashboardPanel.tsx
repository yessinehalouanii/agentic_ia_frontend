// components/abi/EsDashboardPanel.tsx
"use client";

import React, { useEffect, useState } from "react";

type Period = {
  start_date: string;
  end_date: string;
};

type Metric = {
  id: string;
  label: string;
  current: number | null;
  previous: number | null;
  change_pct: number | null;
};

type Props = {
  backendBase: string;
  esUrl: string;
  esUsername?: string;
  esPassword?: string;
  esIndexName: string;
};

function makeDefaultPeriods(): { current: Period; previous: Period } {
  const today = new Date();
  const endCurrent = new Date(today);
  const startCurrent = new Date(today);
  startCurrent.setDate(startCurrent.getDate() - 6); // last 7 days

  const endPrev = new Date(startCurrent);
  endPrev.setDate(endPrev.getDate() - 1);
  const startPrev = new Date(endPrev);
  startPrev.setDate(startPrev.getDate() - 6);

  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  return {
    current: {
      start_date: toISO(startCurrent),
      end_date: toISO(endCurrent),
    },
    previous: {
      start_date: toISO(startPrev),
      end_date: toISO(endPrev),
    },
  };
}

export function EsDashboardPanel({
  backendBase,
  esUrl,
  esUsername,
  esPassword,
  esIndexName,
}: Props) {
  const [current, setCurrent] = useState<Period | null>(null);
  const [previous, setPrevious] = useState<Period | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // whenever ES URL / index changes, reset periods to defaults
  useEffect(() => {
    if (!esUrl || !esIndexName) return;
    const { current, previous } = makeDefaultPeriods();
    setCurrent(current);
    setPrevious(previous);
  }, [esUrl, esIndexName]);

  // fetch dashboard whenever periods change
  useEffect(() => {
    if (!esUrl || !esIndexName || !current) return;

    async function fetchMetrics() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${backendBase}/docs/dashboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            es_base_url: esUrl,
            es_index_name: esIndexName,
            es_username: esUsername?.trim() || null,
            es_password: esPassword || null,
            current,
            previous,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || data.error || `HTTP ${res.status}`);
        }
        setMetrics(data.metrics || []);
      } catch (err: any) {
        setError(String(err.message || err));
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [backendBase, esUrl, esIndexName, esUsername, esPassword, current, previous]);

  if (!esUrl || !esIndexName || !current) return null;

  return (
    <section className="bg-slate-900 text-slate-50 rounded-2xl border border-slate-700 p-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold">ES Dashboard</h2>
          <p className="text-xs text-slate-400">
            Index: <span className="font-mono">{esIndexName}</span>
          </p>
          {previous && (
            <p className="mt-1 text-[11px] text-slate-400">
              Current: {current.start_date} → {current.end_date} • Previous:{" "}
              {previous.start_date} → {previous.end_date}
            </p>
          )}
        </div>

        {/* very simple date controls for now */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex flex-col">
            <span className="mb-1">Current from</span>
            <input
              type="date"
              className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1"
              value={current.start_date}
              onChange={(e) =>
                setCurrent({ ...current, start_date: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col">
            <span className="mb-1">Current to</span>
            <input
              type="date"
              className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1"
              value={current.end_date}
              onChange={(e) =>
                setCurrent({ ...current, end_date: e.target.value })
              }
            />
          </div>

          {previous && (
            <>
              <div className="flex flex-col">
                <span className="mb-1">Prev from</span>
                <input
                  type="date"
                  className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1"
                  value={previous.start_date}
                  onChange={(e) =>
                    setPrevious({ ...previous, start_date: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col">
                <span className="mb-1">Prev to</span>
                <input
                  type="date"
                  className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1"
                  value={previous.end_date}
                  onChange={(e) =>
                    setPrevious({ ...previous, end_date: e.target.value })
                  }
                />
              </div>
            </>
          )}
        </div>
      </div>

      {loading && (
        <p className="text-xs text-slate-400 mb-3">Loading metrics…</p>
      )}
      {error && (
        <p className="text-xs text-rose-400 mb-3">
          Error loading metrics: {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const change = m.change_pct ?? null;
          const negative = change !== null && change < 0;
          const positive = change !== null && change > 0;

          return (
            <div
              key={m.id}
              className="rounded-2xl bg-slate-950/70 border border-slate-700 px-4 py-3"
            >
              <div className="text-[10px] uppercase tracking-wide text-sky-400 mb-1">
                % Change
              </div>
              <div className="text-sm font-medium mb-1">{m.label}</div>
              <div
                className={`text-2xl font-bold mb-1 ${
                  negative ? "text-rose-400" : positive ? "text-emerald-400" : ""
                }`}
              >
                {change === null ? "—" : `${change.toFixed(2)}%`}
              </div>
              <div className="text-[11px] text-slate-400">
                Prev:{" "}
                <span className="font-mono">
                  {m.previous === null ? "—" : m.previous.toFixed(2)}
                </span>{" "}
                • Curr:{" "}
                <span className="font-mono">
                  {m.current === null ? "—" : m.current.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
