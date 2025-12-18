"use client";

import React from "react";
import { TableMeta, QaResultRow } from "./types";

type Props = {
  backendBase: string;
  tablesMeta: TableMeta[];
  tablePreviews: Record<string, QaResultRow[]>;
};

export function TablesPanel({
  backendBase,
  tablesMeta,
  tablePreviews,
}: Props) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-3">
        Loaded tables (server-side)
      </h2>

      {tablesMeta.length === 0 ? (
        <p className="text-sm text-slate-500">
          No tables yet. Upload a CSV or use Fetch all.
        </p>
      ) : (
        <div className="space-y-4">
          {tablesMeta.map((t) => {
            const previewRows = tablePreviews[t.name] || [];
            const firstRow = previewRows[0];

            return (
              <div
                key={t.name}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {t.rows.toLocaleString()} rows • {t.cols} cols
                    </div>
                  </div>
                  <a
                    href={`${backendBase}/tables/${encodeURIComponent(
                      t.name
                    )}/download`}
                    className="text-xs sezon font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Download CSV
                  </a>
                </div>

                {previewRows.length > 0 && firstRow && (
                  <div className="overflow-x-auto">
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
                        {previewRows.map((row, idx) => (
                          <tr
                            key={idx}
                            className={
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                            }
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
                    <div className="px-4 py-1 text-[10px] text-slate-400 border-t border-slate-100">
                      Showing first {previewRows.length} rows.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
