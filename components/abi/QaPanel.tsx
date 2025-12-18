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
}: Props) {
  const [docIds, setDocIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Persist workspace id
  useEffect(() => {
    const saved = localStorage.getItem("abi_workspace_id");
    if (saved) setWorkspaceId(saved);
  }, [setWorkspaceId]);

  useEffect(() => {
    localStorage.setItem("abi_workspace_id", workspaceId);
  }, [workspaceId]);

  // Reset docs when workspace changes
  useEffect(() => {
    setDocIds([]);
    setUploadInfo(null);
  }, [workspaceId]);

  // ------------------------------------------------------------
  // Upload document
  // ------------------------------------------------------------
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
    } catch (err: any) {
      setUploadInfo(`Upload error: ${String(err.message || err)}`);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  }

  // ------------------------------------------------------------
  // Button 1: Use Document (Rules → Apply on DB)
  // calls /docs/ask-analytics (docs rules + tables)
  // ------------------------------------------------------------
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
          // ✅ ensure this button actually uses documents
          mode: "documents",
          // IMPORTANT: pass doc_ids if your backend supports restricting to uploaded docs
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
          (data && (data.error || (data as any).detail)) ||
          text ||
          `Failed (${res.status})`;
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

  // ------------------------------------------------------------
  // Button 2: Analytics (existing) -> tables-only predefined behavior
  // ✅ FIX: call /docs/ask-analytics with mode="predefined"
  // ------------------------------------------------------------
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
          // ✅ tables-only predefined behavior
          mode: "predefined",
          // ✅ ignore docs in this mode
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
          (data && (data.error || (data as any).detail)) ||
          text ||
          `Failed (${res.status})`;
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

  return (
    <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 max-w-3xl">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Ask a question</h2>

      {/* Workspace + Upload (needed for Button 1) */}
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
      </div>

      {/* Question + Model */}
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

        {/* Two buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleUseDocumentRulesApplyDb}
            disabled={qaLoading}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 disabled:opacity-60"
            title="Uses uploaded documents to extract rules, then applies them on DB tables"
          >
            {qaLoading ? "Working…" : "Use Document (Rules → DB)"}
          </button>

          <button
            type="button"
            onClick={handleAnalyticsExisting}
            disabled={qaLoading}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60"
            title="Uses existing analytics LLM on tables only"
          >
            {qaLoading ? "Working…" : "Analytics (existing)"}
          </button>
        </div>
      </div>

      {/* Result */}
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
                    <th key={col} className="px-3 py-2 text-left font-semibold text-slate-700">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {qaResponse.result.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
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
