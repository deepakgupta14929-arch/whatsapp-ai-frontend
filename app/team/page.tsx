"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1400";

type AgentStats = {
  agentId: string;
  name: string;
  email: string;
  role: string;
  totalLeads: number;
  hotLeads: number;
  closedLeads: number;
  conversionRate: number;
};

export default function TeamPage() {
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/agents/stats`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      setAgents(data.agents || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load team stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team performance</h1>
          <p className="text-sm text-slate-400 mt-1">
            See how your agents are handling leads in this agency.
          </p>
        </div>

        <button
          onClick={loadStats}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-600"
        >
          Refresh
        </button>
      </header>

      {loading && (
        <p className="text-sm text-slate-400 mb-3">Loading stats…</p>
      )}

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}

      {agents.length === 0 && !loading && !error && (
        <p className="text-sm text-slate-500">
          No agents or leads yet. Add agents to this workspace and assign
          leads to them.
        </p>
      )}

      {agents.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">
                  Role
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">
                  Leads
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">
                  Hot
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">
                  Closed
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">
                  Conversion
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr
                  key={agent.agentId}
                  className="border-b border-slate-900/60 last:border-b-0 hover:bg-slate-900/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-50">
                      {agent.name || "Unnamed"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {agent.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300 capitalize">
                    {agent.role}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-100">
                    {agent.totalLeads}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-300">
                    {agent.hotLeads}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-300">
                    {agent.closedLeads}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-100">
                      {agent.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
