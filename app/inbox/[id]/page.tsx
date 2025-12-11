"use client";

/**
 * Lead chat page (client component)
 *
 * - Fetches messages for a lead (polling).
 * - Shows visit banner if a latest visit exists.
 * - Allows manual reply (POST to backend).
 * - Opens VisitBookingModal and refreshes banner after booking.
 *
 * Replace the file at app/inbox/[id]/page.tsx with this code.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { SalesCoachPanel } from "@/app/components/analytics/SalesCoachPanel";
import VisitBookingModal from "@/app/components/VisitBookingModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1400";

/* ---------- Types ---------- */

// One chat message
type Message = {
  from: string; // "lead" | "bot" | "agent"
  text: string;
  at?: string;
};

// Lead + its messages as returned by /api/leads/:id/messages
type LeadData = {
  leadId: string;
  name?: string;
  phone?: string;
  messages: Message[];
};

// One visit record (minimal)
type Visit = {
  _id: string;
  date: string;
  timeSlot: string;
  visitStatus: string;
  familyComing?: boolean;
  pickupRequired?: boolean;
  notes?: string;
};

/* ---------- Component ---------- */

export default function LeadPage() {
  // Get route param /inbox/[id]
  const params = useParams<{ id: string }>();
  const leadId = params?.id as string;

  // Chat / lead state
  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Input & sending state
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Latest visit banner state
  const [latestVisit, setLatestVisit] = useState<Visit | null>(null);

  // Visit modal open/close
  const [showVisitModal, setShowVisitModal] = useState(false);

  /* ---------------------------
     Fetch messages for this lead
     - Defensive logging so we can see what's happening in the browser console
     - Normalizes returned payload into the shape UI expects
     --------------------------- */
  const fetchMessages = useCallback(async () => {
    if (!leadId) {
      console.warn("fetchMessages: no leadId (page mounted without id)");
      return;
    }

    const url = `${API_URL}/api/leads/${leadId}/messages`;
    console.log("fetchMessages: calling", url);

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(url, { credentials: "include" });
      console.log("fetchMessages: status", res.status);

      // read raw text to show any non-JSON error too
      const text = await res.text();
      console.log("fetchMessages: raw response text:", text?.slice?.(0, 200) ?? text);

      let data: any;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        console.error("fetchMessages: JSON parse error", parseErr);
        throw new Error("Invalid JSON from messages endpoint");
      }

      // Defensive normalization:
      // Some backends return { messages: [...] } while others return { leadId, name, messages }
      // We normalize to { leadId, name, messages }
      let normalized: LeadData | null = null;
      if (!data) {
        normalized = null;
      } else if (Array.isArray(data.messages)) {
        // already has messages array
        normalized = {
          leadId: data.leadId ?? leadId,
          name: data.name ?? data.leadName ?? data.name,
          messages: data.messages,
        };
      } else if (Array.isArray(data)) {
        // unexpectedly returned an array — treat it as messages
        normalized = {
          leadId,
          name: undefined,
          messages: data as Message[],
        };
      } else if (data.messages === undefined && data.messages === null && data.messages?.length === 0) {
        // fallback
        normalized = { leadId, name: data.name ?? undefined, messages: [] };
      } else {
        // last fallback — try to find messages key anywhere
        const msgs = data.messages ?? data.data?.messages ?? [];
        normalized = { leadId: data.leadId ?? leadId, name: data.name ?? undefined, messages: msgs };
      }

      console.log("fetchMessages: normalized:", {
        leadId: normalized?.leadId,
        name: normalized?.name,
        messagesCount: normalized?.messages?.length ?? 0,
      });

      setLead(normalized);
    } catch (err: any) {
      console.error("fetchMessages error:", err);
      setError(err?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  /* ---------------------------
     Fetch latest visit(s) then pick newest for this lead
     - many backends don't expose lead-specific endpoint; this fetches all and filters
     --------------------------- */
  const fetchLatestVisit = useCallback(
    async (currentLeadId: string) => {
      if (!currentLeadId) return;

      const url = `${API_URL}/api/visits`; // fetch all then filter client-side
      console.log("fetchLatestVisit: calling", url, "for lead", currentLeadId);

      try {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) {
          console.error("fetchLatestVisit: failed status", res.status);
          return;
        }

        const data = await res.json();
        const allVisits: Visit[] = data?.visits ?? [];

        // Filter visits that belong to this lead (leadId may be populated object or string)
        const visitsForLead = allVisits.filter((v: any) => {
          if (!v.leadId) return false;
          if (typeof v.leadId === "string") return v.leadId === currentLeadId;
          // populated object: v.leadId._id or v.leadId.id
          return v.leadId._id === currentLeadId || v.leadId.id === currentLeadId;
        });

        if (visitsForLead.length === 0) {
          setLatestVisit(null);
          console.log("fetchLatestVisit: 0 visits for lead", currentLeadId);
          return;
        }

        // pick newest by date
        visitsForLead.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const newest = visitsForLead[0];
        console.log("fetchLatestVisit: newest for lead", currentLeadId, newest);
        setLatestVisit(newest);
      } catch (err) {
        console.error("fetchLatestVisit error:", err);
      }
    },
    []
  );

  /* ---------------------------
     Initial load and polling
     - run on leadId change
     --------------------------- */
  useEffect(() => {
    if (!leadId) {
      console.warn("LeadPage: no leadId; skipping initial load");
      return;
    }

    // initial load
    fetchMessages();
    fetchLatestVisit(leadId);

    // poll for messages every 5s
    const id = setInterval(fetchMessages, 5000);
    return () => clearInterval(id);
  }, [leadId, fetchMessages, fetchLatestVisit]);

  /* ---------------------------
     Send manual reply via backend
     - ensure endpoint path matches your backend; using /api/leads/:id/reply
     --------------------------- */
  async function handleSend() {
    const text = input.trim();
    if (!text || !leadId) return;

    const url = `${API_URL}/api/leads/${leadId}/reply`;
    console.log("handleSend: POST to", url, "message:", text);

    try {
      setSending(true);
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ message: text }).toString(),
      });

      console.log("handleSend: status", res.status);
      const tx = await res.text();
      console.log("handleSend: raw response:", tx?.slice?.(0, 400) ?? tx);

      if (!res.ok) {
        setError(`Send failed: ${res.status}`);
        return;
      }

      // refresh messages after success
      setInput("");
      await fetchMessages();
    } catch (err) {
      console.error("handleSend error:", err);
      setError((err as any)?.message || "Send failed");
    } finally {
      setSending(false);
    }
  }

  /* Helpful debug: log lead state when it changes in the browser console */
  useEffect(() => {
    console.log("lead state updated:", {
      leadId: lead?.leadId,
      name: lead?.name,
      messagesCount: lead?.messages?.length ?? 0,
    });
  }, [lead]);

  /* ---------- Render ---------- */
  return (
    <div className="grid grid-cols-3 gap-4 h-full p-4">
      {/* TOP banner: show latest visit if present */}
      <div className="col-span-3 mb-2">
        {latestVisit && (
          <div className="text-[11px] px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-600/60 text-emerald-200 inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              Visit booked for {new Date(latestVisit.date).toLocaleString()} — {latestVisit.timeSlot} ({latestVisit.visitStatus})
            </span>
          </div>
        )}
      </div>

      {/* LEFT: Chat UI */}
      <div className="col-span-2 border border-slate-800 rounded-xl bg-slate-950 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-50">{lead?.name || "Lead"}</div>
            <div className="text-[11px] text-slate-400">{lead?.phone || ""}</div>
          </div>

          <div className="flex gap-2">
            <button onClick={fetchMessages} className="text-[11px] px-2 py-1 rounded border border-slate-700 hover:border-emerald-400">
              Refresh chat
            </button>

            <button className="px-3 py-1 text-xs bg-emerald-600 rounded hover:bg-emerald-500" onClick={() => setShowVisitModal(true)}>
              📅 Book Visit
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-xs">
          {loading && <div className="text-slate-400 text-[11px]">Loading messages…</div>}
          {error && <div className="text-red-400 text-[11px]">{error}</div>}
          {!loading && (!lead || (lead.messages && lead.messages.length === 0)) && (
            <div className="text-slate-500 text-[11px]">No messages yet for this lead.</div>
          )}

          {lead?.messages?.map((msg, index) => {
            const isAgent = msg.from === "bot" || msg.from === "agent";
            return (
              <div key={index} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-[11px] leading-snug ${isAgent ? "bg-emerald-600 text-white rounded-br-sm" : "bg-slate-800 text-slate-50 rounded-bl-sm"}`}>
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input row */}
        <div className="border-t border-slate-800 px-4 py-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a manual WhatsApp reply to this lead…"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
          />
          <button onClick={handleSend} disabled={sending || !input.trim()} className={`px-4 py-2 text-xs rounded-full ${sending || !input.trim() ? "bg-slate-700 text-slate-300 opacity-60 cursor-not-allowed" : "bg-emerald-500 text-slate-900 hover:bg-emerald-400"}`}>
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>

      {/* RIGHT: AI Sales Coach */}
      <div className="col-span-1">
        <SalesCoachPanel leadId={leadId} />
      </div>

      {/* Visit booking modal */}
      {showVisitModal && (
        <VisitBookingModal
          leadId={leadId}
          onClose={() => setShowVisitModal(false)}
          onSuccess={async () => {
            // After booking, close modal and refresh visits banner
            setShowVisitModal(false);
            await fetchLatestVisit(leadId);
          }}
        />
      )}
    </div>
  );
}
