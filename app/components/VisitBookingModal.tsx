"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1400";

type VisitBookingModalProps = {
  leadId: string;
  onClose: () => void;
  onSuccess: () => void; // called when booking succeeds
};

export default function VisitBookingModal({
  leadId,
  onClose,
  onSuccess,
}: VisitBookingModalProps) {
  // form state
  const [date, setDate] = useState("");              // HTML datetime-local string
  const [timeSlot, setTimeSlot] = useState("morning");
  const [familyComing, setFamilyComing] = useState(false);
  const [pickupRequired, setPickupRequired] = useState(false);
  const [notes, setNotes] = useState("");

  // ui state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!date || !timeSlot) {
      setError("Please pick a date and time slot.");
      return;
    }

    try {
      setLoading(true);

      // convert datetime-local string → ISO string for backend
      const isoDate = new Date(date).toISOString();

      const res = await fetch(`${API_URL}/api/visits/${leadId}/book`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: isoDate,
          timeSlot,
          familyComing,
          pickupRequired,
          notes,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Booking failed (${res.status})`);
      }

      // success → let parent refresh banner
      onSuccess();
    } catch (err: any) {
      console.error("Visit booking error:", err);
      setError(err.message || "Failed to book visit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-full max-w-md rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs text-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Book Site Visit</h2>
          <button
            className="text-[11px] px-2 py-1 rounded border border-slate-700 hover:border-slate-500"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Date & time */}
          <div className="space-y-1">
            <label className="block text-[11px] text-slate-300">
              Visit Date & Time
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Time slot select (optional but nice) */}
          <div className="space-y-1">
            <label className="block text-[11px] text-slate-300">
              Time Slot
            </label>
            <select
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-400"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-[11px]">
              <input
                type="checkbox"
                checked={familyComing}
                onChange={(e) => setFamilyComing(e.target.checked)}
              />
              Family coming
            </label>
            <label className="flex items-center gap-1 text-[11px]">
              <input
                type="checkbox"
                checked={pickupRequired}
                onChange={(e) => setPickupRequired(e.target.checked)}
              />
              Pickup needed
            </label>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="block text-[11px] text-slate-300">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-[11px] text-red-400">{error}</div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] px-3 py-1 rounded border border-slate-700 hover:border-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-[11px] px-3 py-1 rounded bg-emerald-500 text-slate-900 hover:bg-emerald-400 disabled:opacity-50"
            >
              {loading ? "Booking…" : "Save visit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

