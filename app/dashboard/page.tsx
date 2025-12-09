'use client';

import { useEffect, useState } from 'react';
import { fetchAnalyticsSummary } from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type TrendPoint = {
  date: string;
  label: string;
  leads: number;
  conversions: number;
};

type Metrics = {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  fakeLeads: number;
  convertedLeads: number;
  conversionRate: number;
  followupsSent: number;
  followupsScheduled: number;
  whatsappIn: number;
  whatsappOutAI: number;
  stageChanges: number;
};

type AnalyticsResponse = {
  ok: boolean;
  metrics: Metrics;
  trend7Days: TrendPoint[];
  recentEvents: {
    _id: string;
    type: string;
    createdAt: string;
    meta?: any;
  }[];
};

type TabKey = 'overview' | 'insights';

export default function DashboardPage() {
  const [tab, setTab] = useState<TabKey>('insights'); // default to Insights
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetchAnalyticsSummary();
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error(err);
          setError(err?.message || 'Failed to load analytics');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = data?.metrics;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Agency Dashboard
            </h1>
            <p className="text-sm text-slate-400">
              See how WhatsFlow AI is handling and converting your WhatsApp leads.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-800 mb-4 flex gap-4">
          <button
            onClick={() => setTab('overview')}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              tab === 'overview'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab('insights')}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              tab === 'insights'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Insights
          </button>
        </div>

        {loading && (
          <div className="py-10 text-sm text-slate-400">Loading analytics...</div>
        )}
        {error && !loading && (
          <div className="py-4 text-sm text-red-400">Error: {error}</div>
        )}

        {!loading && !error && metrics && data && (
          <>
            {tab === 'overview' && (
              <OverviewTab metrics={metrics} trend={data.trend7Days} />
            )}

            {tab === 'insights' && (
              <InsightsTab metrics={metrics} events={data.recentEvents} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ------------- OVERVIEW TAB -------------

function OverviewTab({
  metrics,
  trend,
}: {
  metrics: Metrics;
  trend: TrendPoint[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Total Leads"
          value={metrics.totalLeads}
          helper="All WhatsApp & contact leads"
        />
        <MetricCard
          label="Hot Leads"
          value={metrics.hotLeads}
          helper="AI marked as hot"
        />
        <MetricCard
          label="Fake / Junk Leads"
          value={metrics.fakeLeads}
          helper="Filtered by AI"
        />
        <MetricCard
          label="Conversion Rate"
          value={`${metrics.conversionRate}%`}
          helper="Leads marked as closed"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Last 7 days – Leads vs Conversions">
          {trend.length === 0 ? (
            <div className="text-xs text-slate-500">
              No leads yet in the last 7 days.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="leads" />
                  <Line type="monotone" dataKey="conversions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Automation Activity">
          <ul className="text-sm space-y-1 text-slate-300">
            <li>
              <span className="font-medium">Follow-ups scheduled:</span>{' '}
              {metrics.followupsScheduled}
            </li>
            <li>
              <span className="font-medium">Follow-ups sent:</span>{' '}
              {metrics.followupsSent}
            </li>
            <li>
              <span className="font-medium">AI WhatsApp replies:</span>{' '}
              {metrics.whatsappOutAI}
            </li>
            <li>
              <span className="font-medium">Incoming WhatsApp messages:</span>{' '}
              {metrics.whatsappIn}
            </li>
            <li>
              <span className="font-medium">Pipeline moves:</span>{' '}
              {metrics.stageChanges}
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

// ------------- INSIGHTS TAB -------------

function InsightsTab({
  metrics,
  events,
}: {
  metrics: Metrics;
  events: { _id: string; type: string; createdAt: string; meta?: any }[];
}) {
  const hotShare =
    metrics.totalLeads > 0
      ? `${Math.round((metrics.hotLeads / metrics.totalLeads) * 100)}%`
      : '0%';

  const fakeRate =
    metrics.totalLeads > 0
      ? `${Math.round((metrics.fakeLeads / metrics.totalLeads) * 100)}%`
      : '0%';

  const aiReplyCoverage =
    metrics.whatsappIn > 0
      ? `${Math.round((metrics.whatsappOutAI / metrics.whatsappIn) * 100)}%`
      : '0%';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="AI Hot Lead Share"
          value={hotShare}
          helper="Hot leads out of all leads"
        />
        <MetricCard
          label="Fake Lead Rate"
          value={fakeRate}
          helper="Junk leads filtered out"
        />
        <MetricCard
          label="AI Reply Coverage"
          value={aiReplyCoverage}
          helper="Incoming vs AI replies"
        />
      </div>

      <Panel title="Recent AI Activity (Proof of Work)">
        <RecentEventsList events={events} />
      </Panel>
    </div>
  );
}

// ------------- SMALL COMPONENTS -------------

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
        {label}
      </div>
      <div className="text-2xl font-semibold mb-1">{value}</div>
      {helper && <div className="text-xs text-slate-500">{helper}</div>}
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-sm font-medium text-slate-200 mb-2">{title}</div>
      {children}
    </div>
  );
}

function RecentEventsList({
  events,
}: {
  events: { _id: string; type: string; createdAt: string; meta?: any }[];
}) {
  if (!events.length) {
    return (
      <div className="text-xs text-slate-500">
        No recent activity. Start sending traffic to your WhatsApp entry
        points.
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto text-xs divide-y divide-slate-800">
      {events.map((e) => (
        <div key={e._id} className="py-2 flex justify-between gap-4">
          <div>
            <div className="font-medium text-slate-200">
              {formatEventType(e.type)}
            </div>
            {e.meta?.messageSnippet && (
              <div className="text-slate-400 line-clamp-1">
                “{e.meta.messageSnippet}”
              </div>
            )}
            {e.meta?.fromStage && e.meta?.toStage && (
              <div className="text-slate-500">
                {e.meta.fromStage} → {e.meta.toStage}
              </div>
            )}
          </div>
          <div className="text-right text-slate-500">
            {new Date(e.createdAt).toLocaleString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              month: 'short',
              day: '2-digit',
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatEventType(type: string) {
  switch (type) {
    case 'lead_created':
      return 'New lead captured';
    case 'lead_converted':
      return 'Lead converted';
    case 'lead_lost':
      return 'Lead marked lost';
    case 'lead_assigned':
      return 'Lead assigned';
    case 'followup_scheduled':
      return 'Follow-up scheduled';
    case 'followup_sent':
      return 'Follow-up sent';
    case 'whatsapp_in':
      return 'WhatsApp message received';
    case 'whatsapp_out_ai':
      return 'AI reply sent';
    case 'stage_changed':
      return 'Pipeline stage changed';
    default:
      return type;
  }
}
