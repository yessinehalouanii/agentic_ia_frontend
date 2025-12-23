// components/abi/QaPanel.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { QaResponse } from "./types";

type Props = {
  backendBase: string;

  workspaceId: string;
  setWorkspaceId: (v: string) => void;

  question: string;
  setQuestion: (v: string) => void;

  modelName: string;
  setModelName: (v: string) => void;

  apiKeyOverride: string;
  setApiKeyOverride: (v: string) => void;

  qaLoading: boolean;
  setQaLoading: (v: boolean) => void;

  qaResponse: QaResponse | null;
  setQaResponse: (v: QaResponse | null) => void;

  // ✅ ES context (from HomePage)
  esUrl: string;
  esUsername?: string;
  esPassword?: string;
  esIndexName: string;
};

type UploadResponse = {
  doc_id: string;
  filename: string;
  chunks_indexed?: number;
  error?: string;
};

// /docs/ask-analytics response
type DocsAnalyticsResponse = {
  insight?: string;
  rows?: Array<Record<string, any>>;
  rules_used?: string;
  error?: string;
  code?: string;
};

// /chat response
type ChatOnlyResponse = {
  answer: string;
  used_chunks?: any[];
  error?: string;
};

// ✅ /es/ask/dynamic response (we care mainly about `query`)
type EsAskResponse = {
  ok?: boolean;
  query?: string;
  dsl?: any;
  rows?: Array<Record<string, any>>;
  insight?: string;
  error?: string;
};

// ✅ /es/run-dsl/dynamic response
type EsRunDslResponse = {
  ok?: boolean;
  index?: string;
  body?: any;
  hits?: Array<Record<string, any>>;
  raw?: any;
  error?: string;
};

export function QaPanel({
  backendBase,
  workspaceId,
  setWorkspaceId,
  question,
  setQuestion,
  modelName,
  setModelName,
  apiKeyOverride,
  setApiKeyOverride,
  qaLoading,
  setQaLoading,
  qaResponse,
  setQaResponse,

  esUrl,
  esUsername,
  esPassword,
  esIndexName,
}: Props) {
  const [docIds, setDocIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [showTips, setShowTips] = useState(true);

  // ✅ NEW: ES DSL text + execution info
  const [esDsl, setEsDsl] = useState<string>("");
  const [esExecInfo, setEsExecInfo] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("abi_workspace_id");
    if (saved) setWorkspaceId(saved);
  }, [setWorkspaceId]);

  useEffect(() => {
    localStorage.setItem("abi_workspace_id", workspaceId);
  }, [workspaceId]);

  useEffect(() => {
    setDocIds([]);
    setUploadInfo(null);
  }, [workspaceId]);

  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setUploading(true);
    setUploadInfo(null);

    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("workspace_id", workspaceId);

      const res = await fetch(`${backendBase}/documents/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Upload failed");
      }

      const data = (await res.json()) as UploadResponse;
      if (data.error) throw new Error(data.error);

      setDocIds((prev) => [...prev, data.doc_id]);
      setUploadInfo(
        `Uploaded ${data.filename} ✅` +
          (data.chunks_indexed ? ` (${data.chunks_indexed} chunks)` : "")
      );

      setShowTips(true);
    } catch (err: any) {
      setUploadInfo(`Upload error: ${String(err.message || err)}`);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  }

  async function handleDocsChatOnly() {
    if (!docIds.length) {
      setQaResponse({
        error: "Upload at least one document first (Docs Chat uses documents only).",
        insight: null,
        result: [],
      });
      return;
    }

    setQaLoading(true);
    setQaResponse(null);

    try {
      const res = await fetch(`${backendBase}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspace_id: workspaceId,
          message: question,
          doc_ids: docIds.length ? docIds : null,
          model_name: modelName,
          api_key: apiKeyOverride || null,
        }),
      });

      const text = await res.text();
      let data: ChatOnlyResponse | null = null;

      try {
        data = text ? (JSON.parse(text) as ChatOnlyResponse) : null;
      } catch {
        data = { answer: "", error: text };
      }

      if (!res.ok) {
        const msg = (data as any)?.detail || data?.error || text || `Failed (${res.status})`;
        throw new Error(msg);
      }

      setQaResponse({
        error: null,
        insight: data?.answer || "",
        result: [],
      });
    } catch (err: any) {
      setQaResponse({ error: String(err.message || err), insight: null, result: [] });
    } finally {
      setQaLoading(false);
    }
  }

  async function handleUseDocumentRulesApplyDb() {
    setQaLoading(true);
    setQaResponse(null);

    try {
      const res = await fetch(`${backendBase}/docs/ask-analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspace_id: workspaceId,
          question,
          mode: "documents",
          doc_ids: docIds.length ? docIds : null,
          model: modelName,
          api_key: apiKeyOverride || null,
        }),
      });

      const text = await res.text();
      let data: DocsAnalyticsResponse | null = null;

      try {
        data = text ? (JSON.parse(text) as DocsAnalyticsResponse) : null;
      } catch {
        data = { error: text };
      }

      if (!res.ok) {
        const msg =
          (data && (data.error || (data as any).detail)) || text || `Failed (${res.status})`;
        throw new Error(msg);
      }

      setQaResponse({
        error: null,
        insight: data?.insight || "",
        result: data?.rows || [],
      });
    } catch (err: any) {
      setQaResponse({ error: String(err.message || err), insight: null, result: [] });
    } finally {
      setQaLoading(false);
    }
  }

  async function handleAnalyticsExisting() {
    setQaLoading(true);
    setQaResponse(null);

    try {
      const res = await fetch(`${backendBase}/docs/ask-analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspace_id: workspaceId,
          question,
          mode: "predefined",
          doc_ids: null,
          model: modelName,
          api_key: apiKeyOverride || null,
        }),
      });

      const text = await res.text();
      let data: DocsAnalyticsResponse | null = null;

      try {
        data = text ? (JSON.parse(text) as DocsAnalyticsResponse) : null;
      } catch {
        data = { error: text };
      }

      if (!res.ok) {
        const msg =
          (data && (data.error || (data as any).detail)) || text || `Failed (${res.status})`;
        throw new Error(msg);
      }

      setQaResponse({
        error: null,
        insight: data?.insight || "",
        result: data?.rows || [],
      });
    } catch (err: any) {
      setQaResponse({ error: String(err.message || err), insight: null, result: [] });
    } finally {
      setQaLoading(false);
    }
  }

  // ✅ Ask ES -> generate DSL only
  async function handleAskEs() {
    const baseUrl = (esUrl || "").trim();
    const indexName = (esIndexName || "").trim();
    const q = (question || "").trim();

    if (!baseUrl) {
      setQaResponse({
        error: "Connect to Elasticsearch first (missing ES URL).",
        insight: null,
        result: [],
      });
      return;
    }
    if (!indexName) {
      setQaResponse({
        error: "Choose an Elasticsearch index first.",
        insight: null,
        result: [],
      });
      return;
    }
    if (!q) {
      setQaResponse({
        error: "Type a question first.",
        insight: null,
        result: [],
      });
      return;
    }

    setQaLoading(true);
    setQaResponse(null);
    setEsExecInfo(null);

    try {
      const res = await fetch(`${backendBase}/es/ask/dynamic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          base_url: baseUrl,
          username: esUsername?.trim() ? esUsername.trim() : null,
          password: esPassword?.trim() ? esPassword : null,
          index_name: indexName,
          question: q,
          model: modelName,
          api_key: apiKeyOverride || null,
          size: 50,
          flatten: true,
          // run_query: false  // implicit; backend default
        }),
      });

      const text = await res.text();
      let data: EsAskResponse | null = null;

      try {
        data = text ? (JSON.parse(text) as EsAskResponse) : null;
      } catch {
        data = { error: text };
      }

      if (!res.ok) {
        const msg = (data as any)?.detail || data?.error || text || `Failed (${res.status})`;
        throw new Error(msg);
      }

      const dslText = data?.query || (data as any)?.dsl || "";
      if (!dslText) {
        throw new Error("No DSL returned from /es/ask/dynamic");
      }

      // ✅ Put DSL in its own editable textarea
      setEsDsl(dslText);

      // Optional user-facing message
      setQaResponse({
        error: null,
        insight:
          "ES DSL generated below. You can edit it, then click “Run ES DSL on DB” to execute it.",
        result: [],
      });
    } catch (err: any) {
      setQaResponse({ error: String(err.message || err), insight: null, result: [] });
    } finally {
      setQaLoading(false);
    }
  }

 // ✅ NEW: Run the DSL on your ES DB (with aggregations → table)
async function handleRunEsDsl() {
  const baseUrl = (esUrl || "").trim();
  if (!baseUrl) {
    setQaResponse({
      error: "Connect to Elasticsearch first (missing ES URL).",
      insight: null,
      result: [],
    });
    return;
  }

  if (!esDsl.trim()) {
    setQaResponse({
      error: "No ES DSL to execute. Generate or paste a DSL first.",
      insight: null,
      result: [],
    });
    return;
  }

  setQaLoading(true);
  setQaResponse(null);
  setEsExecInfo(null);

  try {
    const res = await fetch(`${backendBase}/es/run-dsl/dynamic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        base_url: baseUrl,
        username: esUsername?.trim() ? esUsername.trim() : null,
        password: esPassword?.trim() ? esPassword : null,
        dsl: esDsl,
        flatten: true,
      }),
    });

    const text = await res.text();
    let data: EsRunDslResponse | null = null;

    try {
      data = text ? (JSON.parse(text) as EsRunDslResponse) : null;
    } catch {
      data = { error: text };
    }

    if (!res.ok) {
      const msg = (data as any)?.detail || data?.error || text || `Failed (${res.status})`;
      throw new Error(msg);
    }

    const raw = (data as any)?.raw || {};
    const hits = data?.hits || [];
    const aggs = raw?.aggregations || null;

    // ----------------- Build rows for the table -----------------
    let rows: Array<Record<string, any>> = [];
    let insightText = "";

    if (hits.length > 0) {
      // Normal search: show document hits as before
      rows = hits;
      insightText = `ES DSL executed successfully. Showing ${Math.min(
        rows.length,
        50
      )} document hit(s).`;
    } else if (aggs) {
      // Case 1: group_by_location + average_total_sales (terms agg)
      if (aggs.group_by_location?.buckets) {
        const buckets = aggs.group_by_location.buckets;
        rows = buckets.map((b: any) => ({
          location_id: b.key,
          doc_count: b.doc_count,
          average_total_sales: b.average_total_sales?.value ?? null,
        }));

        const preview = rows
          .slice(0, 3)
          .map(
            (r) =>
              `location_id ${r.location_id}: ${Number(
                r.average_total_sales
              ).toFixed(2)}`
          )
          .join(" · ");

        insightText =
          rows.length > 0
            ? `Average total sales per location_id. First locations: ${preview}${
                rows.length > 3 ? " …" : ""
              }`
            : "ES DSL executed successfully, but no locations were returned in the aggregation.";
      }
      // Case 2: simple avg aggregation: { "average_total_sales": { "value": ... } }
      else if (
        aggs.average_total_sales &&
        aggs.average_total_sales.value !== undefined
      ) {
        rows = [
          {
            metric: "average_total_sales",
            value: aggs.average_total_sales.value,
          },
        ];
        insightText =
          "ES DSL executed successfully. Showing average_total_sales aggregation.";
      }
      // Case 3: fallback – unknown aggregation shape, just dump JSON
      else {
        rows = [
          {
            aggregations: JSON.stringify(aggs),
          },
        ];
        insightText =
          "ES DSL executed successfully. Showing raw aggregations JSON (unrecognized agg shape).";
      }
    } else {
      // No hits and no aggregations
      insightText =
        "ES DSL executed successfully, but no document hits or aggregations were returned.";
      rows = [];
    }

    // ----------------- Exec info (top-right grey text) -----------------
    const totalObj = raw?.total ?? null;
    const totalPretty =
      typeof totalObj === "object" && totalObj !== null
        ? `${totalObj.value} (${totalObj.relation})`
        : totalObj ?? "0";

    setEsExecInfo(
      `Executed on index "${data?.index ?? "?"}". Took: ${
        raw?.took ?? "?"
      } ms. Matched: ${totalPretty}`
    );

    // Feed rows into the existing table below
    setQaResponse({
      error: null,
      insight: insightText,
      result: rows,
    });
  } catch (err: any) {
    setQaResponse({ error: String(err.message || err), insight: null, result: [] });
  } finally {
    setQaLoading(false);
  }
}


  return (
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 max-w-3xl">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Ask a question</h2>

      <div className="mb-4 space-y-3">
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Workspace (namespace)
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value || "default")}
              placeholder="default"
            />
            <div className="text-[11px] text-slate-500 mt-1">
              Namespace: <span className="font-mono">{workspaceId}</span>
            </div>
          </div>

          <div className="pt-6">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.md"
              onChange={handlePickFile}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
              >
                {uploading ? "Uploading…" : "📎 Upload"}
              </button>

              <button
                type="button"
                disabled={uploading}
                onClick={() => setDocIds([])}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
              >
                🧹 Clear docs
              </button>
            </div>

            <div className="text-[11px] text-slate-500 mt-1 text-center">
              {docIds.length ? `${docIds.length} doc(s)` : "No docs"}
            </div>
          </div>
        </div>

        {uploadInfo && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">
            {uploadInfo}
          </div>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-amber-900">
              Tips to improve “Docs Chat” accuracy
            </div>
            <button
              type="button"
              onClick={() => setShowTips((v) => !v)}
              className="text-xs font-semibold text-amber-900 underline underline-offset-2"
            >
              {showTips ? "Hide" : "Show"}
            </button>
          </div>

          {showTips && (
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 space-y-1">
              <li>
                Use clear headings like <b>Definitions</b>, <b>Formulas</b>, <b>Examples</b>,{" "}
                <b>Exceptions</b>.
              </li>
              <li>
                For rules, write them as short lines: <b>Rule:</b> … / <b>Then:</b> …{" "}
              </li>
              <li>
                Put formulas in one line:{" "}
                <code className="px-1 rounded bg-white/60">
                  minimum_wage = total × base_price
                </code>
              </li>
              <li>Add an example input/output (it boosts retrieval a lot).</li>
              <li>
                If you want Analytics to work well, include a <b>Field mapping</b> section (doc
                terms → DB columns).
              </li>
            </ul>
          )}

          <div className="mt-2 text-[12px] text-amber-800">
            No strict format required — these are just best practices to reduce confusion/hallucination.
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Ask…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">LLM model</label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              OpenAI API key (optional override)
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={apiKeyOverride}
              onChange={(e) => setApiKeyOverride(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDocsChatOnly}
            disabled={qaLoading}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            {qaLoading ? "Working…" : "Docs Chat (documents only)"}
          </button>

          <button
            type="button"
            onClick={handleUseDocumentRulesApplyDb}
            disabled={qaLoading}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 disabled:opacity-60"
          >
            {qaLoading ? "Working…" : "Use Document (Rules → DB)"}
          </button>

          <button
            type="button"
            onClick={handleAnalyticsExisting}
            disabled={qaLoading}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60"
          >
            {qaLoading ? "Working…" : "Analytics (existing)"}
          </button>

          {/* ✅ Ask ES -> generate DSL */}
          <button
            type="button"
            onClick={handleAskEs}
            disabled={qaLoading}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
            title={esIndexName ? `Ask ES index: ${esIndexName}` : "Choose an ES index first"}
          >
            {qaLoading ? "Working…" : "Ask ES (generate DSL)"}
          </button>
        </div>
      </div>

      {/* ✅ ES DSL textarea + Run button */}
      {esDsl && (
        <div className="mt-6 space-y-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            ES DSL (editable)
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono min-h-[180px]"
            value={esDsl}
            onChange={(e) => setEsDsl(e.target.value)}
          />
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleRunEsDsl}
              disabled={qaLoading}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
            >
              {qaLoading ? "Running…" : "Run ES DSL on DB"}
            </button>
            {esExecInfo && (
              <div className="text-[11px] text-slate-500">{esExecInfo}</div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {qaResponse?.error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
            <strong>Error:</strong> {qaResponse.error}
          </div>
        )}

        {qaResponse?.insight && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-800 whitespace-pre-wrap">
            <strong>Answer:</strong> {qaResponse.insight}
          </div>
        )}

        {qaResponse?.result && qaResponse.result.length > 0 && (
          <div className="overflow-auto border border-slate-200 rounded-lg">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  {Object.keys(qaResponse.result[0]).map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left font-semibold text-slate-700"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {qaResponse.result.slice(0, 50).map((row, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                  >
                    {Object.keys(qaResponse.result![0]).map((col) => (
                      <td key={col} className="px-3 py-2 text-slate-800">
                        {String((row as any)[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {qaResponse.result.length > 50 && (
              <div className="px-3 py-2 text-[11px] text-slate-500">
                Showing first 50 rows (of {qaResponse.result.length}).
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
