"use client";

import React, { useEffect, useState } from "react";

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

  selectedEsIndex: string;
  setSelectedEsIndex: (v: string) => void;

  // ✅ NEW: parent stores schema for LLM/QA
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
  selectedEsIndex,
  setSelectedEsIndex,
  onMappingLoaded,
}: EsConnectProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingStatus, setMappingStatus] = useState<string | null>(null);

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
    setSelectedEsIndex("");
    setStatus(null);
    setLoading(true);

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
        setSelectedEsIndex(names[0]);
        setStatus(`Connected. Found ${names.length} indice${names.length === 1 ? "" : "s"}.`);
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

  // ✅ Fetch mapping when selected index changes
  useEffect(() => {
    async function fetchMapping() {
      const baseUrl = esUrl.trim();
      const indexName = selectedEsIndex?.trim();

      if (!baseUrl || !indexName) return;

      setMappingLoading(true);
      setMappingStatus(null);

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

        setMappingStatus(`Schema loaded (${fields.length} fields).`);
      } catch (err: any) {
        setMappingStatus(`Schema error: ${String(err.message || err)}`);
      } finally {
        setMappingLoading(false);
      }
    }

    fetchMapping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEsIndex]);

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
              Choose index
            </label>
            <select
              className="w-full rounded border border-slate-300 px-2 py-1"
              value={selectedEsIndex}
              onChange={(e) => setSelectedEsIndex(e.target.value)}
            >
              {esIndices.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <div className="mt-2 text-[10px] text-slate-500">
              {mappingLoading ? "Loading schema…" : mappingStatus || "Schema not loaded yet."}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
