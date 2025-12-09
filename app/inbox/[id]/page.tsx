"use client"; // This is a client-side React component (can use hooks, browser APIs)

import { useEffect, useState, useCallback } from "react"; // React hooks
import { useParams } from "next/navigation"; // To read the dynamic [id] from the URL
import { SalesCoachPanel } from "@/app/components/analytics/SalesCoachPanel"; // Right-side AI coach
import VisitBookingModal from "@/app/components/VisitBookingModal"; // Visit booking popup

// Base URL of your backend API (fallback to localhost:1400 if env is missing)
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1400";

// ---------- Types for data coming from backend ----------

// One chat message in the conversation
type Message = {
  from: string; // "lead" | "bot" | "agent"
  text: string; // message text
  at?: string;  // ISO timestamp (optional)
};

// Lead + its messages returned from /api/leads/:id/messages
type LeadData = {
  leadId: string;
  name?: string;
  phone?: string;
  messages: Message[];
};

// One site-visit booking
type Visit = {
  _id: string;
  date: string;        // ISO date string
  timeSlot: string;    // e.g. "morning" | "afternoon" | "evening"
  visitStatus: string; // "pending" | "completed" | "cancelled"
  familyComing?: boolean;
  pickupRequired?: boolean;
  notes?: string;
  // leadId can be a string OR a populated object, depending on your API
  leadId?: string | { _id: string; name?: string };
};

// ---------- Main page component for /inbox/[id] ----------

export default function LeadPage() {
  // Read /inbox/[id] from the URL (Next.js router params)
  const params = useParams<{ id: string }>();
  const leadId = params.id as string;

  // State: current lead + messages
  const [lead, setLead] = useState<LeadData | null>(null);

  // State: loading + error for messages
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State: input box + sending flag for manual replies
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // State: latest visit for this lead (for green banner)
  const [latestVisit, setLatestVisit] = useState<Visit | null>(null);

  // State: whether the "Book Visit" modal is opened
  const [showVisitModal, setShowVisitModal] = useState(false);

  // ---------- Fetch messages for this lead ----------

  // useCallback so we can reuse this in effects and after sending a reply
  const fetchMessages = useCallback(async () => {
    if (!leadId) return; // safety guard

    try {
      setLoading(true);
      setError(null);

      // Call backend to get lead + messages
      const res = await fetch(`${API_URL}/api/leads/${leadId}/messages`, {
        credentials: "include", // send cookies/session
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json(); // expected: { leadId, name, phone, messages: [...] }
      setLead(data); // store in state, triggers re-render
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  // ---------- Fetch latest visit for this lead (banner at top) ----------

  // This function loads ALL visits and then filters for this lead
  async function loadVisitBanner(currentLeadId: string) {
    try {
      const res = await fetch(`${API_URL}/api/visits`, {
        credentials: "include", // again, include session cookies
      });

      if (!res.ok) {
        console.error("Failed to load visits", res.status);
        return;
      }

      const data = await res.json();          // expected: { visits: [...] }
      const allVisits: Visit[] = data.visits || [];

      // Only keep visits that belong to this lead
      const visitsForLead = allVisits.filter((v) => {
        if (!v.leadId) return false;

        // Case 1: leadId is a string
        if (typeof v.leadId === "string") {
          return v.leadId === currentLeadId;
        }

        // Case 2: leadId is a populated object { _id, name, ... }
        return v.leadId._id === currentLeadId;
      });

      if (visitsForLead.length === 0) {
        setLatestVisit(null); // no visit → no banner
        return;
      }

      // Sort by date and pick the latest one
      const latest = visitsForLead.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];

      setLatestVisit(latest); // store visit for banner
    } catch (err) {
      console.error("loadVisitBanner error:", err);
    }
  }

  // ---------- Send manual reply to backend ----------

  async function handleSend() {
    const text = input.trim();
    if (!text || !leadId) return; // ignore empty messages

    try {
      setSending(true);

      // POST to /leads/:id/reply (your existing backend route)
      const res = await fetch(`${API_URL}/leads/${leadId}/reply`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ message: text }).toString(),
      });

      if (!res.ok) {
        console.error("Send reply failed", res.status);
      } else {
        setInput("");        // clear input box
        await fetchMessages(); // reload messages after sending
      }
    } catch (err) {
      console.error("Send reply error:", err);
    } finally {
      setSending(false);
    }
  }

  // ---------- Effects ----------

  // 1) Load messages initially + poll every 5 seconds
  useEffect(() => {
    fetchMessages(); // initial load

    const id = setInterval(fetchMessages, 5000); // polling
    return () => clearInterval(id); // cleanup on unmount
  }, [fetchMessages]);

  // 2) Load visit banner whenever leadId changes
  useEffect(() => {
    if (!leadId) return;
    loadVisitBanner(leadId);
  }, [leadId]);

  // ---------- JSX UI ----------

  return (
    <div className="grid grid-cols-3 gap-4 h-full p-4">
      {/* TOP ROW: Visit banner across the top */}
      <div className="col-span-3 mb-2">
        {latestVisit && (
          <div className="text-[11px] px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-600/60 text-emerald-200 inline-flex items-center gap-2">
            {/* Small green dot */}
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {/* Human-readable date/time + timeSlot + status */}
            <span>
              Visit booked for{" "}
              {new Date(latestVisit.date).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              — {latestVisit.timeSlot} (
              {latestVisit.visitStatus || "pending"})
            </span>
          </div>
        )}
      </div>

      {/* LEFT SIDE → Chat UI (2 columns wide) */}
      <div className="col-span-2 border border-slate-800 rounded-xl bg-slate-950 flex flex-col">
        {/* Header: lead info + buttons */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          {/* Lead name + phone */}
          <div>
            <div className="text-sm font-semibold text-slate-50">
              {lead?.name || "Lead"}
            </div>
            <div className="text-[11px] text-slate-400">
              {lead?.phone || ""}
            </div>
          </div>

          {/* Right side: buttons */}
          <div className="flex items-center gap-2">
            {/* Refresh chat button */}
            <button
              onClick={fetchMessages}
              className="text-[11px] px-2 py-1 rounded border border-slate-700 hover:border-emerald-400"
            >
              Refresh chat
            </button>

            {/* Book visit button opens modal */}
            <button
              className="px-3 py-1 text-xs bg-emerald-600 rounded hover:bg-emerald-500"
              onClick={() => setShowVisitModal(true)}
            >
              📅 Book Visit
            </button>
          </div>
        </div>

        {/* Messages area (scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-xs">
          {/* Loading indicator */}
          {loading && (
            <div className="text-slate-400 text-[11px]">
              Loading messages…
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="text-red-400 text-[11px]">
              {error}
            </div>
          )}

          {/* Empty state when no messages */}
          {!loading && lead?.messages?.length === 0 && (
            <div className="text-slate-500 text-[11px]">
              No messages yet for this lead.
            </div>
          )}

          {/* Actual message bubbles */}
          {lead?.messages?.map((msg, index) => {
            const isAgent = msg.from === "bot" || msg.from === "agent"; // right side if bot/agent

            return (
              <div
                key={index}
                className={`flex ${
                  isAgent ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-3 py-2 text-[11px] leading-snug ${
                    isAgent
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-slate-800 text-slate-50 rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input row for manual reply */}
        <div className="border-t border-slate-800 px-4 py-3 flex items-center gap-2">
          {/* Text input */}
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

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className={`px-4 py-2 text-xs rounded-full ${
              sending || !input.trim()
                ? "bg-slate-700 text-slate-300 opacity-60 cursor-not-allowed"
                : "bg-emerald-500 text-slate-900 hover:bg-emerald-400"
            }`}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>

      {/* RIGHT SIDE → AI Sales Coach panel */}
      <div className="col-span-1">
        <SalesCoachPanel leadId={leadId} />
      </div>

      {/* Visit booking modal (opens when showVisitModal is true) */}
      {showVisitModal && (
        <VisitBookingModal
          leadId={leadId}
          onClose={() => setShowVisitModal(false)} // close without doing anything
          onSuccess={() => {
            // After successful booking:
            setShowVisitModal(false);  // close modal
            loadVisitBanner(leadId);   // refresh the green banner
          }}
        />
      )}
    </div>
  );
}
