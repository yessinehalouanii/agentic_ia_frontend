// app/page.tsx
"use client";

import React, { useState } from "react";
import { useBackendBase } from "@/components/abi/useBackendConfig";
import { TableMeta, QaResultRow, Endpoint, QaResponse } from "@/components/abi/types";

import { AuthPanel } from "@/components/abi/AuthPanel";
import { EndpointsPanel } from "@/components/abi/EndpointsPanel";
import { TablesPanel } from "@/components/abi/TablesPanel";
import { QaPanel } from "@/components/abi/QaPanel";

import { EsSamplePanel } from "@/components/abi/EsSamplePanel";
import { EsConnectPanel, EsField } from "@/components/abi/EsConnectPanel";

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
  const [tablePreviews, setTablePreviews] = useState<Record<string, QaResultRow[]>>(
    {}
  );

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
  const [selectedEsIndex, setSelectedEsIndex] = useState<string>("");

  // store schema fields for selected index (optional, debug)
  const [esFields, setEsFields] = useState<EsField[]>([]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-80 bg-white border-r border-slate-200 px-6 py-6 flex flex-col gap-8 overflow-y-auto">
        <AuthPanel
          baseUrl={baseUrl}
          setBaseUrl={setBaseUrl}
          isLoggedIn={isLoggedIn}
          setIsLoggedIn={setIsLoggedIn}
        />

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
          selectedEsIndex={selectedEsIndex}
          setSelectedEsIndex={setSelectedEsIndex}
          onMappingLoaded={(_, fields) => setEsFields(fields)}
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

          {selectedEsIndex && (
            <p className="mt-2 text-xs text-slate-500">
              ES index: <span className="font-mono">{selectedEsIndex}</span> • schema fields:{" "}
              <span className="font-mono">{esFields.length}</span>
            </p>
          )}
        </header>

        <TablesPanel
          backendBase={backendBase}
          tablesMeta={tablesMeta}
          tablePreviews={tablePreviews}
        />

        <div className="mt-8">
          <EsSamplePanel
            esUrl={esUrl}
            esUsername={esUsername}
            esPassword={esPassword}
            selectedIndexName={selectedEsIndex}
          />
        </div>

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
            // ✅ NEW (Ask ES)
            esUrl={esUrl}
            esUsername={esUsername}
            esPassword={esPassword}
            esIndexName={selectedEsIndex}
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
