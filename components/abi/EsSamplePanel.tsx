// components/abi/EsSamplePanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useBackendBase } from "@/components/abi/useBackendConfig";
import type { QaResultRow } from "@/components/abi/types";

type EsSamplePanelProps = {
  esUrl: string;
  esUsername?: string;
  esPassword?: string;
  selectedIndexName?: string;

  // ✅ optional: let parent control it (otherwise component manages local state)
  flattenDefault?: boolean;
};

function toCsvValue(v: any): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  const escaped = s.replace(/"/g, '""');
  if (/[",\n\r]/.test(escaped)) return `"${escaped}"`;
  return escaped;
}

function rowsToCsv(rows: QaResultRow[], cols: string[]): string {
  if (!rows || rows.length === 0) return "";
  const header = cols.map(toCsvValue).join(",");
  const lines = rows.map((r) => cols.map((c) => toCsvValue((r as any)?.[c])).join(","));
  return [header, ...lines].join("\n");
}

function prettyCell(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v); // keeps original nested objects readable
  return String(v);
}

export function EsSamplePanel({
  esUrl,
  esUsername,
  esPassword,
  selectedIndexName,
  flattenDefault = true,
}: EsSamplePanelProps) {
  const backendBase = useBackendBase();

  const [indexName, setIndexName] = useState<string>(selectedIndexName || "");
  const [size, setSize] = useState<number>(10);

  // ✅ flatten toggle
  const [flatten, setFlatten] = useState<boolean>(flattenDefault);

  const [rows, setRows] = useState<QaResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedIndexName) setIndexName(selectedIndexName);
  }, [selectedIndexName]);

  // ✅ compute columns safely for both flattened & non-flattened rows
  const columns = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      Object.keys(r || {}).forEach((k) => set.add(k));
    }
    return Array.from(set);
  }, [rows]);

  const csvText = useMemo(() => rowsToCsv(rows, columns), [rows, columns]);

  async function handleFetchSample() {
    const baseUrl = (esUrl || "").trim();
    const idx = (indexName || "").trim();

    if (!baseUrl) {
      setError("Please connect first: missing Elasticsearch URL.");
      return;
    }
    if (!idx) {
      setError("Please choose an index name.");
      return;
    }

    setError(null);
    setLoading(true);
    setRows([]);

    try {
      // flatten is optional now
      const res = await fetch(
        `${backendBase}/es/sample/dynamic?size=${size}&flatten=${
          flatten ? "true" : "false"
        }`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            base_url: baseUrl,
            username: esUsername?.trim() ? esUsername.trim() : null,
            password: esPassword?.trim() ? esPassword : null,
            index_name: idx,
          }),
        }
      );

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { detail: text };
      }

      if (!res.ok) throw new Error(data?.detail || `Fetch failed (${res.status})`);

      // expecting list of docs as rows
      setRows((Array.isArray(data) ? data : data?.rows || []) as QaResultRow[]);
    } catch (err: any) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadCsv() {
    if (!rows.length) return;

    const idx = (indexName || "sample").trim().replace(/[^\w\-]+/g, "_");
    const filename = `es_${idx}_${rows.length}rows_${
      flatten ? "flatten" : "original"
    }.csv`;

    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-2">
        Elasticsearch sample viewer
      </h2>

      <div className="flex flex-col gap-3 mb-4 text-xs">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Index name
            </label>
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-2 py-1"
              value={indexName}
              onChange={(e) => setIndexName(e.target.value)}
            />
          </div>

          <div className="w-28">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Rows
            </label>
            <input
              type="number"
              className="w-full rounded border border-slate-300 px-2 py-1"
              value={size}
              min={1}
              max={200}
              onChange={(e) => setSize(Number(e.target.value) || 10)}
            />
          </div>

          <button
            type="button"
            onClick={handleFetchSample}
            disabled={loading}
            className="whitespace-nowrap rounded-lg bg-rose-500 text-white px-3 py-2 font-semibold hover:bg-rose-600 disabled:opacity-60"
          >
            {loading ? "Fetching…" : "Fetch sample"}
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={loading || rows.length === 0}
            className="whitespace-nowrap rounded-lg border border-slate-300 bg-white text-slate-800 px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-60"
            title={rows.length ? `Download ${rows.length} rows as CSV` : "Fetch sample first"}
          >
            Download CSV
          </button>
        </div>

        {/* flatten toggle */}
        <div className="flex items-center gap-2">
          <input
            id="es-flatten"
            type="checkbox"
            checked={flatten}
            onChange={(e) => setFlatten(e.target.checked)}
          />
          <label htmlFor="es-flatten" className="text-slate-700">
            Flatten nested objects (dotted columns)
          </label>

          <span className="ml-2 text-[10px] text-slate-500">
            {flatten
              ? "Good for tables + aggregations"
              : "Keeps original nested objects; cells show JSON"}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
          {error}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-auto">
          <table className="min-w-full text-[11px]">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-2 py-1 text-left font-semibold text-slate-700 border-b border-slate-200 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-2 py-1 border-b border-slate-100 whitespace-nowrap"
                      title={
                        typeof (row as any)?.[col] === "object"
                          ? prettyCell((row as any)?.[col])
                          : undefined
                      }
                    >
                      {prettyCell((row as any)?.[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-3 py-1 text-[10px] text-slate-400 border-t border-slate-100">
            Showing {rows.length} documents from{" "}
            <span className="font-mono">{indexName}</span> — mode:{" "}
            <span className="font-mono">
              {flatten ? "flatten=true" : "flatten=false"}
            </span>
          </div>
        </div>
      ) : (
        !loading &&
        !error && (
          <p className="text-xs text-slate-500">
            No data yet. Choose an index and click <strong>Fetch sample</strong>.
          </p>
        )
      )}
    </section>
  );
}
