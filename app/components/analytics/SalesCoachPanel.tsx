"use client";

import { useEffect, useState } from "react";
import { fetchCoachAdvice, sendCoachReply } from "@/lib/api";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1400";

type CoachAdvice = {
  suggestedReply: string;
  closingTip?: string | null;
  objectionHandling?: { label: string; reply: string }[];
  hotAlert?: string | null;
  fakeAlert?: string | null;
};

type Template = {
  label: string;
  reply: string;
};

// ⭐ Real estate–specific objection templates (India / middle-class tone)
const RE_OBJECTION_TEMPLATES: Template[] = [
  {
    label: "Price too high",
    reply:
      "Samajh sakta hoon sir, budget important hota hai 😊 Aapka exact budget range bata dein (for example 45–55 lakh), main usi range me best 2–3 options short list kar deta hoon jisme negotiation bhi possible ho."
  },
  {
    label: "Will decide later",
    reply:
      "Bilkul sir, decision time leta hai 👍 Ek kaam karte hain – main aapko 2 options share karta hoon jo aapke budget aur location ke hisaab se best hain. Aap jab comfortable ho tab visit plan kar sakte hain. Aapko kis area me zyada interest hai abhi?"
  },
  {
    label: "Loan problem",
    reply:
      "Koi tension nahi sir, zyada tar buyers loan hi se lete hain 😊 Hamare paas bank tie-ups bhi hote hain. Aapka approx budget aur kitna loan chahiye, agar bata dein toh main aapko loan-friendly projects suggest kar sakta hoon."
  },
  {
    label: "Only checking price",
    reply:
      "Bilkul sir, price idea lena zaroori hai 👍 Aap approximately kaunse area aur kis budget range me soch rahe hain? Us hisaab se main aapko realistic price range bata dunga, taaki aapko market ka clear idea mil jaye."
  },
  {
    label: "Too far / location issue",
    reply:
      "Samajh gaya sir, location daily travelling ke liye important hota hai 🚗 Aapke office / kids school kis area me hain? Main aapko aise options suggest karta hoon jahan se aapka daily travel manageable rahe, metro/road connectivity bhi theek ho."
  }
];

// ⭐ Visit booking templates
const RE_VISIT_TEMPLATES: Template[] = [
  {
    label: "Weekend visit",
    reply:
      "Sir weekend pe ek short site visit rakh lete hain? 20–30 min me aapko exact flat, surroundings aur view ka idea mil jayega. Saturday ya Sunday kaunsa din aapke liye better rahega?"
  },
  {
    label: "Today / tomorrow visit",
    reply:
      "Agar aap free ho toh aaj ya kal ek quick visit plan kar sakte hain sir. Main timing aapke hisaab se adjust karwa dunga. Aapko kaunsa slot comfortable rahega – morning, afternoon ya evening?"
  },
  {
    label: "Family visit",
    reply:
      "Best decision tab hota hai jab family bhi visit karke feel kar le 👨‍👩‍👧‍👦 Aap family ke saath kab aa sakte hain site pe? Main ussi hisaab se ek private visit arrange karwa deta hoon."
  }
];

// ⭐ Follow-up templates when lead is silent
const RE_FOLLOWUP_TEMPLATES: Template[] = [
  {
    label: "Gentle follow-up",
    reply:
      "Sir, kal jo options share kiye the unke bare me aapka feedback lena tha 😊 Agar aapko theek lage toh ek short call ya visit plan kar sakte hain. Aapko kis time pe baat karna easy rahega?"
  },
  {
    label: "Offer nudge",
    reply:
      "Sir, jis project me aapne interest dikhaya tha wahan currently achha deal chal raha hai (price & availability dono wise). Agar aap chahein toh main aapke naam se ek unit short-list karwa sakta hoon. Aap interested ho toh ek visit fix karein?"
  },
  {
    label: "Last-touch polite",
    reply:
      "Sir, last time aap 2BHK options dekh rahe the is range me. Bas check kar raha tha ki abhi bhi requirement active hai ya pause kar di? Dono case me please ek chota sa reply de dein, taaki main aapko disturb na karun 🙂"
  }
];

export function SalesCoachPanel({ leadId }: { leadId: string }) {
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReply, setSelectedReply] = useState<string>("");
    const [lead, setLead] = useState<any>(null);
   
    useEffect(() => {
  if (!leadId) return;

  async function fetchLeadDetails() {
    try {
      const res = await fetch(`${API_URL}/api/leads/${leadId}/messages`, {
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        setLead(data);
      }
    } catch (err) {
      console.error("Lead detail load error:", err);
    }
  }

  fetchLeadDetails();
  const timer = setInterval(fetchLeadDetails, 7000);
  return () => clearInterval(timer);
}, [leadId]);

  // Load AI advice from backend
  useEffect(() => {
    if (!leadId) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchCoachAdvice(leadId);
        if (!cancelled) {
          if (res.ok && res.advice) {
            setAdvice(res.advice);
            setSelectedReply(res.advice.suggestedReply || "");
          } else {
            setError(res.error || "No AI advice available for this lead.");
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error(err);
          setError(err?.message || "Failed to load AI coach");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const handleSend = async () => {
    if (!selectedReply.trim()) return;
    try {
      setSending(true);
      setError(null);
      const res = await sendCoachReply(leadId, selectedReply);
      if (!res.ok) {
        throw new Error(res.error || "Failed to send");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (text: string) => {
    setSelectedReply(text);
  };

  return (
    <div className="h-full flex flex-col rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold">AI Sales Coach</div>
          <div className="text-[10px] text-slate-400">
            Real estate–focused Hinglish scripts to close faster.
          </div>
        </div>
        <button
          className="text-[11px] px-2 py-1 border border-slate-700 rounded-full hover:border-emerald-400"
          onClick={() => {
            // Quick refresh: simple way for now
            window.location.reload();
          }}
        >
          Refresh
        </button>
      </div>

      {/* Loading / error states */}
      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          Thinking about best reply…
        </div>
      )}

      {error && !loading && (
        <div className="flex-1 text-red-400 text-[11px] mb-2">{error}</div>
      )}

      {/* Main content */}
      {!loading && !error && (
        <>
          {/* Alerts */}
          {advice && (
            <div className="space-y-1 mb-2">
              {advice.hotAlert && (
                <div className="px-2 py-1 rounded bg-emerald-900/40 border border-emerald-600/60 text-[11px]">
                  🔥 <span className="font-semibold">HOT Lead:</span>{" "}
                  {advice.hotAlert}
                </div>
              )}
              {advice.fakeAlert && (
                <div className="px-2 py-1 rounded bg-amber-900/40 border border-amber-600/60 text-[11px]">
                  ⚠️ <span className="font-semibold">Fake/Junk Hint:</span>{" "}
                  {advice.fakeAlert}
                </div>
              )}
            </div>
          )}
          {lead && (
  <div className="mb-3 p-2 bg-slate-800/50 rounded-lg">
    <div className="text-[11px] text-slate-300 mb-1">Lead Snapshot</div>

    <p>📞 {lead.phone}</p>
    <p>💰 Budget: {lead.budget || "Unknown"}</p>
    <p>🏘️ Requirement: {lead.useCase || "Not given"}</p>
    <p>⏱️ Timeline: {lead.timeline || "Unknown"}</p>
    <p>🔥 Urgency: {lead.aiUrgency || "Analyzing"}</p>
    <p>🎯 Intent: {lead.aiIntent || "Unknown"}</p>

    {/* Fake Detection */}
    {lead.isFake && (
      <p className="text-red-400 text-[10px] mt-1">
        ❌ Low-quality/Fake — {lead.fakeReason || "Poor input"}
      </p>
    )}
  </div>
)}
{lead && (
  <div className="mb-3 p-2 bg-emerald-900/20 rounded-lg border border-emerald-700/40">
    <div className="text-[11px] text-emerald-300 mb-1">Next Best Action</div>
    <p className="text-emerald-400">
      {lead.aiUrgency === "high"
        ? "📞 Call Now — High urgency buyer"
        : lead.aiUrgency === "medium"
        ? "🤝 Send Price & schedule visit"
        : "💬 Ask location + property type + budget"}
    </p>
  </div>
)}



          {/* Suggested reply box */}
          <div className="mb-2">
            <div className="text-[11px] text-slate-400 mb-1">
              Suggested reply (Hinglish)
            </div>
            <textarea
              className="w-full rounded-md bg-slate-950/60 border border-slate-700 px-2 py-1 text-xs resize-none h-20 focus:outline-none focus:border-emerald-400"
              value={selectedReply}
              onChange={(e) => setSelectedReply(e.target.value)}
            />
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => {
                  if (selectedReply) {
                    navigator.clipboard.writeText(selectedReply);
                  }
                }}
                className="text-[11px] px-2 py-1 border border-slate-700 rounded hover:border-slate-500"
              >
                Copy
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !selectedReply.trim()}
                className="text-[11px] px-3 py-1 rounded bg-emerald-500/90 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? "Sending…" : "Send on WhatsApp"}
              </button>
            </div>
          </div>

          {/* Closing tip from AI */}
          {advice?.closingTip && (
            <div className="mb-2">
              <div className="text-[11px] text-slate-400 mb-1">
                Closing tip
              </div>
              <div className="text-[11px] text-slate-200 bg-slate-950/60 border border-slate-800 rounded px-2 py-1">
                {advice.closingTip}
              </div>
            </div>
          )}

          {/* AI-provided objection handling (if any) */}
          {advice?.objectionHandling && advice.objectionHandling.length > 0 && (
            <div className="mt-1 mb-2">
              <div className="text-[11px] text-slate-400 mb-1">
                AI objection ideas
              </div>
              <div className="flex flex-wrap gap-2">
                {advice.objectionHandling.map((obj, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyTemplate(obj.reply)}
                    className="text-[11px] px-2 py-1 rounded-full border border-slate-700 hover:border-emerald-400 bg-slate-950/60"
                  >
                    {obj.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Real Estate Templates */}
          <div className="mt-2 border-t border-slate-800 pt-2 space-y-2">
            {/* Objections */}
            <div>
              <div className="text-[11px] text-slate-400 mb-1">
                Real estate objections
              </div>
              <div className="flex flex-wrap gap-2">
                {RE_OBJECTION_TEMPLATES.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyTemplate(t.reply)}
                    className="text-[11px] px-2 py-1 rounded-full border border-slate-700 bg-slate-950/60 hover:border-emerald-400"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visit booking */}
            <div>
              <div className="text-[11px] text-slate-400 mb-1">
                Site visit scripts
              </div>
              <div className="flex flex-wrap gap-2">
                {RE_VISIT_TEMPLATES.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyTemplate(t.reply)}
                    className="text-[11px] px-2 py-1 rounded-full border border-slate-700 bg-slate-950/60 hover:border-emerald-400"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Follow-up */}
            <div>
              <div className="text-[11px] text-slate-400 mb-1">
                Silent lead follow-up
              </div>
              <div className="flex flex-wrap gap-2">
                {RE_FOLLOWUP_TEMPLATES.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyTemplate(t.reply)}
                    className="text-[11px] px-2 py-1 rounded-full border border-slate-700 bg-slate-950/60 hover:border-emerald-400"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
