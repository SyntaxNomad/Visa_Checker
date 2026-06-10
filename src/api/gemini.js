// Thin client for the server-side visa check (api/check.js).
// The Gemini API key and dataset lookup live on the server — nothing
// sensitive ships in this bundle.

export async function callGemini(passport, residence, destination, residenceStatus) {
  const response = await fetch("/api/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passport, residence, destination, residenceStatus }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  if (!data?.text) {
    throw new Error("Empty response from server.");
  }
  return data.text;
}
