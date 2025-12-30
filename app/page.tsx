// app/page.tsx
"use client";

import React, { useState } from "react";
import { useBackendBase } from "@/components/abi/useBackendConfig";
import {
  TableMeta,
  QaResultRow,
  Endpoint,
  QaResponse,
} from "@/components/abi/types";

import { AuthPanel } from "@/components/abi/AuthPanel";
import { EndpointsPanel } from "@/components/abi/EndpointsPanel";
import { TablesPanel } from "@/components/abi/TablesPanel";
import { QaPanel } from "@/components/abi/QaPanel";

import { EsSamplePanel } from "@/components/abi/EsSamplePanel";
import { EsConnectPanel, EsField } from "@/components/abi/EsConnectPanel";
import { EsDashboardPanel } from "@/components/abi/EsDashboardPanel";

export default function HomePage() {
  const backendBase = useBackendBase();

  const [workspaceId, setWorkspaceId] = useState("default");

  // Business API auth / endpoints
  const [baseUrl, setBaseUrl] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [flatten, setFlatten] = useState(true);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);

  // BI tables
  const [tablesMeta, setTablesMeta] = useState<TableMeta[]>([]);
  const [tablePreviews, setTablePreviews] = useState<
    Record<string, QaResultRow[]>
  >({});

  // QA
  const [question, setQuestion] = useState("");
  const [modelName, setModelName] = useState("gpt-4o-mini");
  const [apiKeyOverride, setApiKeyOverride] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResponse, setQaResponse] = useState<QaResponse | null>(null);

  // Elasticsearch connection state
  const [esUrl, setEsUrl] = useState("");
  const [esUsername, setEsUsername] = useState(""); // optional
  const [esPassword, setEsPassword] = useState(""); // optional

  const [esIndices, setEsIndices] = useState<string[]>([]);

  // 🔁 allow selecting MULTIPLE indices
  const [selectedEsIndices, setSelectedEsIndices] = useState<string[]>([]);

  // 🔁 store schema per index
  const [esFieldsByIndex, setEsFieldsByIndex] = useState<
    Record<string, EsField[]>
  >({});

  // ✅ derived: primary = first selected, secondary = second
  const primaryEsIndex = selectedEsIndices[0] || "";
  const secondaryEsIndex = selectedEsIndices[1] || ""; // ✅ NEW: for customers
  const primaryFieldsCount = primaryEsIndex
    ? esFieldsByIndex[primaryEsIndex]?.length || 0
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-80 bg-white border-r border-slate-200 px-6 py-6 flex flex-col gap-8 overflow-y-auto">
        <AuthPanel
          baseUrl={baseUrl}
          setBaseUrl={setBaseUrl}
          isLoggedIn={isLoggedIn}
          setIsLoggedIn={setIsLoggedIn}
        />

        {/* EsConnectPanel uses multi-select indices */}
        <EsConnectPanel
          backendBase={backendBase}
          esUrl={esUrl}
          setEsUrl={setEsUrl}
          esUsername={esUsername}
          setEsUsername={setEsUsername}
          esPassword={esPassword}
          setEsPassword={setEsPassword}
          esIndices={esIndices}
          setEsIndices={setEsIndices}
          selectedEsIndices={selectedEsIndices}
          setSelectedEsIndices={setSelectedEsIndices}
          onMappingLoaded={(indexName, fields) =>
            setEsFieldsByIndex((prev) => ({
              ...prev,
              [indexName]: fields,
            }))
          }
        />

        <EndpointsPanel
          workspaceId={workspaceId}
          baseUrl={baseUrl}
          isLoggedIn={isLoggedIn}
          flatten={flatten}
          setFlatten={setFlatten}
          endpoints={endpoints}
          setEndpoints={setEndpoints}
          onTablesUpdated={(meta, previews) => {
            setTablesMeta(meta);
            setTablePreviews(previews);
          }}
        />
      </aside>

      <main className="flex-1 px-10 py-10 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            📊 Agentic BI
          </h1>

          {/* show multiple selected indices + primary + field count */}
          {selectedEsIndices.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              ES indices:{" "}
              <span className="font-mono">
                {selectedEsIndices.join(", ")}
              </span>
              {primaryEsIndex && (
                <>
                  {" "}
                  • primary:{" "}
                  <span className="font-mono">{primaryEsIndex}</span>
                  {" • schema fields: "}
                  <span className="font-mono">{primaryFieldsCount}</span>
                </>
              )}
            </p>
          )}
        </header>

        <TablesPanel
          backendBase={backendBase}
          tablesMeta={tablesMeta}
          tablePreviews={tablePreviews}
        />

        {/* preview ALL selected indices instead of a single one */}
        <div className="mt-8 space-y-6">
          {selectedEsIndices.length > 0 ? (
            selectedEsIndices.map((idx) => (
              <EsSamplePanel
                key={idx}
                esUrl={esUrl}
                esUsername={esUsername}
                esPassword={esPassword}
                selectedIndexName={idx}
              />
            ))
          ) : (
            <EsSamplePanel
              esUrl={esUrl}
              esUsername={esUsername}
              esPassword={esPassword}
              selectedIndexName={""}
            />
          )}
        </div>

        {/* Dashboard: still using primary index for now */}
        {esUrl && primaryEsIndex && (
          <div className="mt-8">
            <EsDashboardPanel
              backendBase={backendBase}
              esUrl={esUrl}
              esUsername={esUsername}
              esPassword={esPassword}
              esIndexName={primaryEsIndex}
            />
          </div>
        )}

        <div className="mt-8">
          <QaPanel
            backendBase={backendBase}
            workspaceId={workspaceId}
            setWorkspaceId={setWorkspaceId}
            question={question}
            setQuestion={setSetQuestionSafe(setQuestion)}
            modelName={modelName}
            setModelName={setModelName}
            apiKeyOverride={apiKeyOverride}
            setApiKeyOverride={setApiKeyOverride}
            qaLoading={qaLoading}
            setQaLoading={setQaLoading}
            qaResponse={qaResponse}
            setQaResponse={setQaResponse}
            // ✅ ES context: send primary + secondary to backend
            esUrl={esUrl}
            esUsername={esUsername}
            esPassword={esPassword}
            esIndexName={primaryEsIndex}
            esCustomersIndexName={secondaryEsIndex} // ✅ NEW
          />
        </div>
      </main>
    </div>
  );
}

// small helper to keep your original signature (optional)
function setSetQuestionSafe(
  setQuestion: (v: string) => void
): (v: string) => void {
  return (v: string) => setQuestion(v);
}
