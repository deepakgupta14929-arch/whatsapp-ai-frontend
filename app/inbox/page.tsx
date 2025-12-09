"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1400";

type Lead = {
  _id: string;
  name?: string;
  phone?: string;
  lastMessage?: string;
  stage?: string;
  score?: number | null;

  qualificationLevel?: string;
  aiIntent?: string;
  aiUrgency?: string;
  budget?: string;
  timeline?: string;
  useCase?: string;
  aiNotes?: string;

  isFake?: boolean;
  fakeReason?: string;

  willRespondScore?: number | null;
  willBuyScore?: number | null;
  priorityLevel?: "low" | "medium" | "high" | string;
  engagementNotes?: string;
};

type Scope = "all" | "mine";

export default function InboxPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [scope, setScope] = useState<Scope>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchLeads(nextScope: Scope) {
    try {
      setLoading(true);
      setError(null);
      setScope(nextScope);

      const url =
        nextScope === "mine"
          ? `${API_URL}/api/leads?assignedOnly=true`
          : `${API_URL}/api/leads`;

      const res = await fetch(url, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeads("all");
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* LEFT side – list */}
      <aside className="w-80 border-r border-slate-800 bg-slate-950/80 p-4">
        <h1 className="text-lg font-semibold mb-4">Inbox</h1>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => fetchLeads("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              scope === "all"
                ? "bg-emerald-500 text-slate-900"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            All leads
          </button>
          <button
            onClick={() => fetchLeads("mine")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              scope === "mine"
                ? "bg-sky-500 text-slate-900"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            My leads
          </button>
        </div>

        {loading && (
          <p className="text-xs text-slate-400 mb-2">Loading leads…</p>
        )}
        {error && (
          <p className="text-xs text-red-400 mb-2">{error}</p>
        )}

        {/* Lead cards */}
        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-8rem)] pr-2">
          {leads.length === 0 && !loading && (
            <p className="text-xs text-slate-500">
              No leads for this view.
            </p>
          )}

          {leads.map((lead) => (
            <Link
              key={lead._id}
              href={`/inbox/${lead._id}`}
              className="block"
            >
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2 text-xs cursor-pointer hover:border-emerald-500/70 transition-colors">
                {/* Top: name + phone + last msg */}
                <div className="font-semibold text-slate-50 truncate">
                  {lead.name || "Unnamed lead"}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {lead.phone || "No phone"}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {lead.lastMessage || "No messages yet"}
                </div>

                {/* Engagement row */}
                <div className="mt-1 text-[10px] flex flex-wrap gap-2 items-center">
                  {lead.priorityLevel && (
                    <span
                      className={
                        "px-1.5 py-0.5 rounded-full uppercase tracking-wide text-[9px] " +
                        (lead.priorityLevel === "high"
                          ? "bg-red-500/20 text-red-300 border border-red-500/40"
                          : lead.priorityLevel === "medium"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-slate-700/60 text-slate-200 border border-slate-500/40")
                      }
                    >
                      {lead.priorityLevel === "high"
                        ? "🔥 High priority"
                        : lead.priorityLevel === "medium"
                        ? "Medium priority"
                        : "Low priority"}
                    </span>
                  )}

                  {typeof lead.willRespondScore === "number" && (
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[9px] text-slate-200 border border-slate-700">
                      Respond: {lead.willRespondScore}
                    </span>
                  )}
                  {typeof lead.willBuyScore === "number" && (
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[9px] text-slate-200 border border-slate-700">
                      Buy: {lead.willBuyScore}
                    </span>
                  )}
                </div>

                {/* Engagement notes */}
                {lead.engagementNotes && (
                  <div className="mt-1 text-[10px] text-slate-400 line-clamp-2">
                    {lead.engagementNotes}
                  </div>
                )}

                {/* Score + stage + fake */}
                <div className="mt-1 text-[10px] flex flex-wrap gap-2 items-center">
                  {lead.score != null && (
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[9px] text-emerald-300 border border-slate-700">
                      Score: {lead.score}
                    </span>
                  )}

                  {lead.isFake && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-500/15 text-[9px] text-red-300 border border-red-500/40">
                      Fake / Low-quality
                    </span>
                  )}

                  <span className="uppercase text-[9px] tracking-wide text-emerald-400">
                    {lead.stage || "new"}
                  </span>
                </div>

                {/* Qualification / intent / urgency */}
                <div className="mt-1 text-[10px] flex flex-wrap gap-2 items-center">
                  <span
                    className={
                      "px-1.5 py-0.5 rounded-full uppercase tracking-wide text-[9px] " +
                      (lead.qualificationLevel === "hot"
                        ? "bg-red-500/20 text-red-300 border border-red-500/40"
                        : lead.qualificationLevel === "warm"
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/40"
                        : "bg-slate-700/60 text-slate-200 border border-slate-500/40")
                    }
                  >
                    {lead.qualificationLevel || "new"}
                  </span>

                  {lead.aiIntent && (
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-800/80 text-[9px] text-slate-200">
                      {lead.aiIntent}
                    </span>
                  )}

                  {lead.aiUrgency && (
                    <span
                      className={
                        "px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wide " +
                        (lead.aiUrgency === "high"
                          ? "bg-red-500/15 text-red-300"
                          : lead.aiUrgency === "medium"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-emerald-500/15 text-emerald-300")
                      }
                    >
                      {lead.aiUrgency}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </aside>

      {/* RIGHT placeholder */}
      <main className="flex-1 flex items-center justify-center bg-slate-950">
        <p className="text-sm text-slate-500">
          Select a lead from the left to start conversation 👈
        </p>
      </main>
    </div>
  );
}
