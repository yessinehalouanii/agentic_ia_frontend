"use client";

import React, { useState } from "react";
import { Endpoint, TableMeta, QaResultRow } from "./types";
import { useBackendBase } from "./useBackendConfig";

type Props = {
  // ✅ NEW
  workspaceId: string;

  baseUrl: string;
  isLoggedIn: boolean;

  flatten: boolean;
  setFlatten: (v: boolean) => void;

  endpoints: Endpoint[];
  setEndpoints: React.Dispatch<React.SetStateAction<Endpoint[]>>;

  onTablesUpdated: (meta: TableMeta[], previews: Record<string, QaResultRow[]>) => void;
};

export function EndpointsPanel({
  workspaceId,
  baseUrl,
  isLoggedIn,
  flatten,
  setFlatten,
  endpoints,
  setEndpoints,
  onTablesUpdated,
}: Props) {
  const backendBase = useBackendBase();

  const [epName, setEpName] = useState("");
  const [epPath, setEpPath] = useState("");
  const [epLimit, setEpLimit] = useState<number | undefined>(undefined);

  const [fetching, setFetching] = useState(false);
  const [fetchErrors, setFetchErrors] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  async function refreshTablesFromServer() {
    try {
      const res = await fetch(`${backendBase}/tables/list`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || `List failed (${res.status})`);

      const meta: TableMeta[] = data.tables || [];

      const previews: Record<string, QaResultRow[]> = {};
      await Promise.all(
        meta.map(async (t) => {
          try {
            const rPrev = await fetch(
              `${backendBase}/tables/${encodeURIComponent(t.name)}/preview?limit=10`,
              { credentials: "include" }
            );
            if (!rPrev.ok) return;
            const dPrev = await rPrev.json();
            previews[t.name] = dPrev.rows || [];
          } catch {}
        })
      );

      onTablesUpdated(meta, previews);
    } catch (err: any) {
      setFetchErrors([String(err.message || err)]);
    }
  }

  function handleAddEndpoint() {
    if (!epName.trim() || !epPath.trim()) return;

    const newEp: Endpoint = {
      name: epName.trim(),
      path_or_url: epPath.trim(),
      limit: epLimit && epLimit > 0 ? epLimit : undefined,
    };

    setEndpoints((prev) => [...prev, newEp]);
    setEpName("");
    setEpPath("");
    setEpLimit(undefined);
  }

  function handleDeleteEndpoint(index: number) {
    setEndpoints((prev) => prev.filter((_, i) => i !== index));
  }

  // ✅ FETCH ALL now includes workspace_id
  async function handleFetchAll() {
    if (!isLoggedIn) {
      setFetchErrors(["Not logged in – log in first."]);
      return;
    }
    if (!baseUrl.trim()) {
      setFetchErrors(["Base URL is required."]);
      return;
    }
    if (endpoints.length === 0) {
      setFetchErrors(["Add at least one endpoint."]);
      return;
    }

    setFetching(true);
    setFetchErrors([]);

    try {
      const res = await fetch(`${backendBase}/tables/fetch-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspace_id: workspaceId || "default", // ✅ IMPORTANT
          base_url: baseUrl,
          token: "", // cookie is used server-side; keep field to satisfy schema
          endpoints,
          flatten,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || `Fetch failed (${res.status})`);

      setFetchErrors(data.errors || []);
      await refreshTablesFromServer();
    } catch (err: any) {
      setFetchErrors([String(err.message || err)]);
    } finally {
      setFetching(false);
    }
  }

  async function handleLoadSavedTables() {
    await refreshTablesFromServer();
  }

  async function handleUploadCsv(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setUploadMsg(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${backendBase}/tables/upload-csv`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || `Upload failed (${res.status})`);

      setUploadMsg(`✅ CSV '${data.name}' uploaded (${data.rows} rows, ${data.cols} cols).`);
      await refreshTablesFromServer();
    } catch (err: any) {
      setUploadMsg(`❌ ${String(err.message || err)}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
        2) Endpoints
      </h2>

      <div className="mt-3 text-[11px] text-slate-500">
        Workspace: <span className="font-mono">{workspaceId || "default"}</span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <input
          id="flatten"
          type="checkbox"
          checked={flatten}
          onChange={(e) => setFlatten(e.target.checked)}
        />
        <label htmlFor="flatten" className="text-slate-700">
          Flatten nested objects
        </label>
      </div>

      <div className="mt-3 border border-slate-200 rounded-lg p-3 space-y-2">
        <div className="text-xs font-medium text-slate-600">Add an endpoint or load CSV</div>

        <input
          placeholder="Table name"
          className="w-full rounded border px-2 py-1 text-xs"
          value={epName}
          onChange={(e) => setEpName(e.target.value)}
        />

        <input
          placeholder="Path or full URL"
          className="w-full rounded border px-2 py-1 text-xs"
          value={epPath}
          onChange={(e) => setEpPath(e.target.value)}
        />

        <input
          type="number"
          placeholder="Limit (optional)"
          className="w-full rounded border px-2 py-1 text-xs"
          value={epLimit ?? 0}
          onChange={(e) => setEpLimit(e.target.value ? Number(e.target.value) : undefined)}
        />

        <button onClick={handleAddEndpoint} className="w-full rounded bg-slate-800 text-white text-xs py-1.5">
          Add endpoint
        </button>

        <div className="pt-2 border-t border-slate-200">
          <label className="block text-xs font-medium text-slate-600 mb-1">Upload CSV</label>
          <input
            type="file"
            accept=".csv"
            disabled={uploading}
            onChange={handleUploadCsv}
            className="block w-full text-xs"
          />
          {uploadMsg && (
            <div className="mt-2 rounded border px-2 py-1 text-xs">
              {uploadMsg}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-xs">
        <button onClick={handleLoadSavedTables} className="w-full rounded border py-1.5">
          Load saved tables
        </button>

        <button
          onClick={handleFetchAll}
          disabled={fetching}
          className="w-full rounded bg-rose-500 text-white py-1.5 font-semibold disabled:opacity-60"
        >
          {fetching ? "Fetching…" : "Fetch all"}
        </button>

        {fetchErrors.length > 0 && (
          <div className="mt-2 rounded bg-rose-50 border px-2 py-1 text-rose-700">
            {fetchErrors.map((e, i) => (
              <div key={i}>• {e}</div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
