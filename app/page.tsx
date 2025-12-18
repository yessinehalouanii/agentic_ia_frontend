"use client";

import React, { useState } from "react";
import { useBackendBase } from "@/components/abi/useBackendConfig";
import { TableMeta, QaResultRow, Endpoint, QaResponse } from "@/components/abi/types";
import { AuthPanel } from "@/components/abi/AuthPanel";
import { EndpointsPanel } from "@/components/abi/EndpointsPanel";
import { TablesPanel } from "@/components/abi/TablesPanel";
import { QaPanel } from "@/components/abi/QaPanel";
import { EsSamplePanel } from "@/components/abi/EsSamplePanel";
import { EsConnectPanel } from "@/components/abi/EsConnectPanel";

export default function HomePage() {
  const backendBase = useBackendBase();

  // ✅ Workspace shared between components
  const [workspaceId, setWorkspaceId] = useState("default");

  // Business API auth / endpoints
  const [baseUrl, setBaseUrl] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [flatten, setFlatten] = useState(true);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);

  // BI tables (server-side)
  const [tablesMeta, setTablesMeta] = useState<TableMeta[]>([]);
  const [tablePreviews, setTablePreviews] = useState<Record<string, QaResultRow[]>>({});

  // QA
  const [question, setQuestion] = useState("");
  const [modelName, setModelName] = useState("gpt-4o-mini");
  const [apiKeyOverride, setApiKeyOverride] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResponse, setQaResponse] = useState<QaResponse | null>(null);

  // Elasticsearch connection state
  const [esUrl, setEsUrl] = useState("");
  const [esUsername, setEsUsername] = useState("");
  const [esPassword, setEsPassword] = useState("");
  const [esIndices, setEsIndices] = useState<string[]>([]);
  const [selectedEsIndex, setSelectedEsIndex] = useState<string>("");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
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
        />

        {/* ✅ Pass workspaceId into EndpointsPanel so fetch-all stores tables under correct workspace */}
        <EndpointsPanel
          workspaceId={workspaceId}
          baseUrl={baseUrl}
          isLoggedIn={isLoggedIn}
          flatten={flatten}
          setFlatten={setFlatten}
          endpoints={endpoints}
          setEndpoints={setEndpoints}
          onTablesUpdated={(meta: TableMeta[], previews: Record<string, QaResultRow[]>) => {
            setTablesMeta(meta);
            setTablePreviews(previews);
          }}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 px-10 py-10 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            📊 Agentic BI (modular)
          </h1>
          <p className="mt-2 text-slate-500">
            Same flow as your Streamlit app, but now FastAPI + Next.js, with cleaner components
            and live Elasticsearch support.
          </p>
        </header>

        <TablesPanel backendBase={backendBase} tablesMeta={tablesMeta} tablePreviews={tablePreviews} />

        <div className="mt-8">
          <EsSamplePanel selectedIndexName={selectedEsIndex} />
        </div>

        <div className="mt-8">
          {/* ✅ QaPanel now receives workspaceId from HomePage (single source of truth) */}
          <QaPanel
            backendBase={backendBase}
            workspaceId={workspaceId}
            setWorkspaceId={setWorkspaceId}
            question={question}
            setQuestion={setQuestion}
            modelName={modelName}
            setModelName={setModelName}
            apiKeyOverride={apiKeyOverride}
            setApiKeyOverride={setApiKeyOverride}
            qaLoading={qaLoading}
            setQaLoading={setQaLoading}
            qaResponse={qaResponse}
            setQaResponse={setQaResponse}
          />
        </div>
      </main>
    </div>
  );
}
