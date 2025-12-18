"use client";

import React, { useState } from "react";
import { useBackendBase } from "./useBackendConfig";

type Props = {
  baseUrl: string;
  setBaseUrl: (v: string) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
};

export function AuthPanel({
  baseUrl,
  setBaseUrl,
  isLoggedIn,
  setIsLoggedIn,
}: Props) {
  const backendBase = useBackendBase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  async function handleLogin() {
    setAuthMessage(null);
    try {
      const res = await fetch(`${backendBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          base_url: baseUrl,
          email,
          password,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || `Login failed (${res.status})`);
      }

      setIsLoggedIn(true);
      setAuthMessage("✅ Logged in. Secure session cookie set.");
    } catch (err: any) {
      setIsLoggedIn(false);
      setAuthMessage(`❌ ${String(err.message || err)}`);
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
        1) Connect to your API
      </h2>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Base URL
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            placeholder="https://api.example.com"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Email
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          className="w-full mt-1 rounded-lg bg-rose-500 text-white text-xs font-semibold py-2 hover:bg-rose-600"
        >
          Log in &amp; Start Session
        </button>

        <div className="text-xs mt-2">
          {authMessage ? (
            <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1 text-slate-700">
              {authMessage}
            </div>
          ) : isLoggedIn ? (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1 text-emerald-700">
              Session active.
            </div>
          ) : (
            <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1 text-slate-500">
              Not logged in.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
