"use client";

import React, { useState } from "react";

// A small test panel to exercise backend flows for QA:
// - create a Contact lead (POST /contact)
// - list leads (GET /api/leads)
// - send a manual reply (POST /leads/:id/reply)
// - book a visit (POST /api/visits/:leadId/book)
// - fetch visits (GET /api/visits)
// - fetch event logs (GET /debug-events-all)
// IMPORTANT: requests use credentials: 'include' which requires you to be
// logged-in in the same browser (session cookie). If you are not logged in,
// some endpoints will return 401.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1400";

export default function TestPanel() {
  // UI state used to show results and form values
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // form fields for creating a lead
  const [name, setName] = useState("Test Buyer");
  const [email, setEmail] = useState("test@example.com");
  const [phone, setPhone] = useState("919999999999");
  const [message, setMessage] = useState("I want a 2BHK under 30L");

  // for reply and visit actions
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [replyText, setReplyText] = useState("Thanks — we can arrange a site visit. When are you free?");
  const [visitDate, setVisitDate] = useState( new Date().toISOString().slice(0,16) ); // YYYY-MM-DDTHH:MM
  const [timeSlot, setTimeSlot] = useState("afternoon");

  // helpers
  function clearStatus() {
    setStatus(null);
  }

  // 1) Create contact lead using the same endpoint your site uses for contact form
  // This mirrors submitting the website contact form. The endpoint expects form-urlencoded.
  async function createContactLead() {
    try {
      clearStatus();
      setLoading(true);

      const body = new URLSearchParams();
      body.append("name", name);
      body.append("email", email);
      body.append("phone", phone);
      body.append("message", message);

      // include credentials so the session cookie is sent (you must be logged in)
      const res = await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        credentials: "include",
      });

      const text = await res.text();
      setStatus(`Create contact response: ${res.status} ${text}`);
    } catch (err: any) {
      setStatus(`Create contact error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  // 2) Fetch leads (the API returns leads for your agency)
  async function fetchLeads() {
    try {
      clearStatus();
      setLoading(true);
      const res = await fetch(`${API_URL}/api/leads`, { credentials: "include" });
      const data = await res.json();
      setStatus(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setStatus(`Fetch leads error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  // 3) Send manual reply via backend route /leads/:id/reply (this keeps history consistent)
  async function sendReply() {
    if (!selectedLeadId) return setStatus("Select a lead id first");
    try {
      clearStatus();
      setLoading(true);

      const res = await fetch(`${API_URL}/leads/${selectedLeadId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ message: replyText }).toString(),
        credentials: "include",
      });

      setStatus(`Send reply status: ${res.status}`);
    } catch (err: any) {
      setStatus(`Send reply error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  // 4) Book a visit -> POST /api/visits/:leadId/book
  // Body is expected as JSON in your route (date, timeSlot, familyComing, pickupRequired, notes)
  async function bookVisit() {
    if (!selectedLeadId) return setStatus("Select a lead id first");
    try {
      clearStatus();
      setLoading(true);

      // convert local datetime to ISO (backend expects ISO string)
      const iso = new Date(visitDate).toISOString();

      const payload = {
        date: iso,
        timeSlot,
        familyComing: true,
        pickupRequired: false,
        notes: "Booked from Test Panel",
      };

      const res = await fetch(`${API_URL}/api/visits/${selectedLeadId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json();
      setStatus(`Book visit response: ${res.status} ${JSON.stringify(data)}`);
    } catch (err: any) {
      setStatus(`Book visit error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  // 5) Fetch visits
  async function fetchVisits() {
    try {
      clearStatus();
      setLoading(true);
      const res = await fetch(`${API_URL}/api/visits`, { credentials: "include" });
      const data = await res.json();
      setStatus(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setStatus(`Fetch visits error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  // 6) Fetch debug events log
  async function fetchEvents() {
    try {
      clearStatus();
      setLoading(true);
      const res = await fetch(`${API_URL}/debug-events-all`, { credentials: "include" });
      const data = await res.json();
      setStatus(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setStatus(`Fetch events error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-slate-900 text-slate-50 rounded-lg">
      <h2 className="text-lg font-semibold mb-2">Test Panel — WhatsApp AI SaaS</h2>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs">Name</label>
          <input className="w-full text-sm p-1 rounded bg-slate-800" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs">Email</label>
          <input className="w-full text-sm p-1 rounded bg-slate-800" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs">Phone</label>
          <input className="w-full text-sm p-1 rounded bg-slate-800" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs">Message</label>
          <input className="w-full text-sm p-1 rounded bg-slate-800" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button className="px-3 py-1 bg-emerald-600 rounded" onClick={createContactLead} disabled={loading}>Create contact</button>
        <button className="px-3 py-1 bg-sky-600 rounded" onClick={fetchLeads} disabled={loading}>Fetch leads</button>
        <button className="px-3 py-1 bg-indigo-600 rounded" onClick={fetchEvents} disabled={loading}>Fetch events</button>
        <button className="px-3 py-1 bg-violet-600 rounded" onClick={fetchVisits} disabled={loading}>Fetch visits</button>
      </div>

      <hr className="border-slate-800 my-3" />

      <div className="mb-2">
        <label className="text-xs">Selected lead id (paste from Fetch leads)</label>
        <input className="w-full text-sm p-1 rounded bg-slate-800" value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs">Reply text</label>
          <input className="w-full text-sm p-1 rounded bg-slate-800" value={replyText} onChange={(e) => setReplyText(e.target.value)} />
          <button className="mt-2 px-3 py-1 bg-emerald-600 rounded" onClick={sendReply} disabled={loading || !selectedLeadId}>Send reply</button>
        </div>

        <div>
          <label className="text-xs">Visit datetime</label>
          <input type="datetime-local" className="w-full text-sm p-1 rounded bg-slate-800" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          <label className="text-xs mt-2 block">Slot</label>
          <select className="w-full text-sm p-1 rounded bg-slate-800" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
            <option value="morning">morning</option>
            <option value="afternoon">afternoon</option>
            <option value="evening">evening</option>
          </select>
          <button className="mt-2 px-3 py-1 bg-emerald-600 rounded" onClick={bookVisit} disabled={loading || !selectedLeadId}>Book visit</button>
        </div>
      </div>

      <div className="mt-2">
        <div className="text-xs text-slate-400">Status / API output:</div>
        <pre className="text-[11px] bg-slate-800 p-2 rounded mt-1 max-h-72 overflow-auto">{status || "(no output)"}</pre>
      </div>

      <div className="mt-3 text-xs text-slate-500">Note: you must be logged in (same browser) for session-based endpoints to work.</div>
    </div>
  );
}
