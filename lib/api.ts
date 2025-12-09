export const API_URL = "http://localhost:1400";
//const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1400";

export async function fetchLeadDetail(id: string) {
  const res = await fetch(`${API_URL}/api/leads/${id}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to load lead: ${res.status}`);
  }

  return res.json();
}

export async function fetchAnalyticsSummary() {
  const res = await fetch("http://localhost:1400/api/analytics/summary", {
    // very important → send cookies (session)
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to load analytics");
  }

  return res.json();
}
export async function fetchCoachAdvice(leadId: string) {
  const res = await fetch(`http://localhost:1400/api/coach/${leadId}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to load coach advice');
  }

  return res.json();
}

export async function sendCoachReply(leadId: string, message: string) {
  const res = await fetch(`http://localhost:1400/api/leads/${leadId}/reply`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error('Failed to send reply');
  }

  return res.json();
}
