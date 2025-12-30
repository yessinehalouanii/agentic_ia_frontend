// components/abi/EsConnectPanel.tsx
"use client";

import React, { useState } from "react";

export type EsField = {
  field: string;
  type: string;
  raw?: any;
};

export type EsConnectProps = {
  backendBase: string;

  esUrl: string;
  setEsUrl: (v: string) => void;

  esUsername: string; // optional
  setEsUsername: (v: string) => void;

  esPassword: string; // optional
  setEsPassword: (v: string) => void;

  esIndices: string[];
  setEsIndices: (v: string[]) => void;

  // ✅ multi-select
  selectedEsIndices: string[];
  setSelectedEsIndices: (v: string[]) => void;

  // ✅ parent stores schema for LLM/QA
  onMappingLoaded?: (indexName: string, fields: EsField[]) => void;
};

export function EsConnectPanel({
  backendBase,
  esUrl,
  setEsUrl,
  esUsername,
  setEsUsername,
  esPassword,
  setEsPassword,
  esIndices,
  setEsIndices,
  selectedEsIndices,
  setSelectedEsIndices,
  onMappingLoaded,
}: EsConnectProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // ✅ mapping status per index
  const [mappingStatusByIndex, setMappingStatusByIndex] = useState<
    Record<string, string>
  >({});
  const [mappingLoadingIndex, setMappingLoadingIndex] = useState<string | null>(
    null
  );

  function buildAuthPayload() {
    return {
      base_url: esUrl.trim(),
      username: esUsername?.trim() ? esUsername.trim() : null,
      password: esPassword?.trim() ? esPassword : null,
    };
  }

  async function handleConnect() {
    const baseUrl = esUrl.trim();
    if (!baseUrl) {
      setStatus("Please enter an Elasticsearch URL.");
      return;
    }

    setEsIndices([]);
    setSelectedEsIndices([]);
    setStatus(null);
    setLoading(true);

    // reset mapping state
    setMappingStatusByIndex({});
    setMappingLoadingIndex(null);

    const controller = new AbortController();
    const timeoutMs = 8000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${backendBase}/es/indices/dynamic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify(buildAuthPayload()),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        const msg =
          (data && (data.detail || data.error || data.message)) ||
          (typeof data?.raw === "string" && data.raw) ||
          `Failed (${res.status})`;
        throw new Error(msg);
      }

      const rawIndices: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.indices)
        ? data.indices
        : [];

      const names = rawIndices
        .map((idx: any) => idx?.index as string | undefined)
        .filter((name): name is string => Boolean(name));

      setEsIndices(names);

      if (names.length > 0) {
        setStatus(
          `Connected. Found ${names.length} indice${
            names.length === 1 ? "" : "s"
          }.`
        );
      } else {
        setStatus("Connected but no indices were found.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setStatus(`Error: Connection timed out after ${timeoutMs / 1000}s.`);
      } else {
        setStatus(`Error: ${String(err.message || err)}`);
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  // ✅ fetch mapping for a single index (called when you tick the box)
  async function fetchMappingForIndex(indexName: string) {
    const baseUrl = esUrl.trim();
    if (!baseUrl || !indexName) return;

    setMappingLoadingIndex(indexName);
    setMappingStatusByIndex((prev) => ({
      ...prev,
      [indexName]: "Loading schema…",
    }));

    try {
      const res = await fetch(`${backendBase}/es/mapping/dynamic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...buildAuthPayload(),
          index_name: indexName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || `Mapping failed (${res.status})`);

      const fields = Array.isArray(data?.fields) ? data.fields : [];
      onMappingLoaded?.(indexName, fields);

      setMappingStatusByIndex((prev) => ({
        ...prev,
        [indexName]: `Schema loaded (${fields.length} fields).`,
      }));
    } catch (err: any) {
      setMappingStatusByIndex((prev) => ({
        ...prev,
        [indexName]: `Schema error: ${String(err.message || err)}`,
      }));
    } finally {
      setMappingLoadingIndex((curr) => (curr === indexName ? null : curr));
    }
  }

  // ✅ toggle checkbox + lazy-load mapping on first select
  function toggleIndex(indexName: string) {
    const already = selectedEsIndices.includes(indexName);
    let next: string[];

    if (already) {
      next = selectedEsIndices.filter((n) => n !== indexName);
    } else {
      // newly selected → trigger mapping load if not already done
      if (!mappingStatusByIndex[indexName]) {
        void fetchMappingForIndex(indexName);
      }
      next = [...selectedEsIndices, indexName];
    }

    setSelectedEsIndices(next);
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
        Elasticsearch connection
      </h2>

      <div className="mt-3 space-y-3 text-xs">
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Elasticsearch URL
          </label>
          <input
            type="text"
            className="w-full rounded border border-slate-300 px-2 py-1"
            placeholder="http://1.2.3.4:9200"
            value={esUrl}
            onChange={(e) => setEsUrl(e.target.value)}
          />
        </div>

        {/* Optional auth */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Username (optional)
            </label>
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-2 py-1"
              value={esUsername}
              onChange={(e) => setEsUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Password (optional)
            </label>
            <input
              type="password"
              className="w-full rounded border border-slate-300 px-2 py-1"
              value={esPassword}
              onChange={(e) => setEsPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleConnect}
          disabled={loading}
          className="w-full rounded bg-slate-800 text-white py-1.5 font-semibold hover:bg-slate-900 disabled:opacity-60"
        >
          {loading ? "Connecting…" : "Connect & list indices"}
        </button>

        {status && (
          <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">
            {status}
          </div>
        )}

        {esIndices.length > 0 && (
          <div className="pt-1 border-t border-slate-100">
            <label className="block text-[11px] font-medium text-slate-600 mb-1 mt-2">
              Choose indices
            </label>

            {/* ✅ checkbox list with hover highlight */}
            <div className="mt-1 max-h-40 overflow-y-auto rounded border border-slate-200 bg-white">
              {esIndices.map((name) => {
                const checked = selectedEsIndices.includes(name);
                const mappingStatus = mappingStatusByIndex[name];
                const loadingThis = mappingLoadingIndex === name;

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleIndex(name)}
                    className="w-full flex items-center justify-between px-2 py-1 text-left text-[11px] hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-3 w-3"
                        checked={checked}
                        onChange={() => toggleIndex(name)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="font-mono truncate max-w-[140px]">
                        {name}
                      </span>
                    </div>

                    {loadingThis ? (
                      <span className="text-[10px] text-slate-400">
                        Loading…
                      </span>
                    ) : mappingStatus ? (
                      <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {mappingStatus}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              Tick one or more indices. Schema is loaded on first tick and
              cached.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
