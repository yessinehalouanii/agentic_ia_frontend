"use client";

import React, { useEffect, useState } from "react";
import { useBackendBase } from "@/components/abi/useBackendConfig";
import type { QaResultRow } from "@/components/abi/types";

type EsSamplePanelProps = {
  selectedIndexName?: string; // 👈 comes from EsConnectPanel
};

export function EsSamplePanel({ selectedIndexName }: EsSamplePanelProps) {
  const backendBase = useBackendBase();

  const [indexName, setIndexName] = useState<string>(selectedIndexName || "");
  const [size, setSize] = useState<number>(10);

  const [rows, setRows] = useState<QaResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When user changes index from EsConnectPanel, sync it here
  useEffect(() => {
    if (selectedIndexName) {
      setIndexName(selectedIndexName);
    }
  }, [selectedIndexName]);

  async function handleFetchSample() {
    if (!indexName.trim()) {
      setError("Please type an index name (e.g. invoices).");
      return;
    }

    setError(null);
    setLoading(true);
    setRows([]);

    try {
      const res = await fetch(
        `${backendBase}/es/sample/${encodeURIComponent(
          indexName.trim()
        )}?size=${size}`,
        { credentials: "include" }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || `Fetch failed (${res.status})`);
      }

      setRows(data as QaResultRow[]);
    } catch (err: any) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  const firstRow = rows[0];

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-2">
        Elasticsearch sample viewer
      </h2>
      <p className="text-xs text-slate-500 mb-3">
        Type any index name from your ES cluster (e.g.{" "}
        <code>invoices</code>) and preview rows in a spreadsheet-style table.
      </p>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4 text-xs">
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Index name
          </label>
          <input
            type="text"
            className="w-full rounded border border-slate-300 px-2 py-1"
            placeholder="invoices, customers, events, ..."
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
      </div>

      {error && (
        <div className="mb-3 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Table */}
      {firstRow ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-auto">
          <table className="min-w-full text-[11px]">
            <thead className="bg-slate-50">
              <tr>
                {Object.keys(firstRow).map((col) => (
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
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  {Object.keys(firstRow).map((col) => (
                    <td
                      key={col}
                      className="px-2 py-1 border-b border-slate-100 whitespace-nowrap"
                    >
                      {String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-1 text-[10px] text-slate-400 border-t border-slate-100">
            Showing {rows.length} documents from{" "}
            <span className="font-mono">{indexName}</span>.
          </div>
        </div>
      ) : (
        !loading &&
        !error && (
          <p className="text-xs text-slate-500">
            No data yet. Type an index name and click <strong>Fetch sample</strong>.
          </p>
        )
      )}
    </section>
  );
}
