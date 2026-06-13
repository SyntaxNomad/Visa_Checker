import { useState } from "react";

const KEY = "visaneed_history";
const MAX = 20;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

/**
 * Local check history: every successful check is saved with its full result,
 * so it can be reopened instantly (and offline). One entry per route —
 * re-checking replaces the previous result.
 */
function sortEntries(list) {
  return [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.ts - a.ts);
}

export function useHistory() {
  const [history, setHistory] = useState(load);

  function persistAnd(next) {
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }

  function addCheck(entry) {
    setHistory((prev) => {
      const sameRoute = (h) =>
        h.passport === entry.passport && h.destination === entry.destination && h.residence === entry.residence;
      const existing = prev.find(sameRoute);
      const merged = sortEntries([
        { id: crypto.randomUUID(), ts: Date.now(), pinned: existing?.pinned || false, ...entry },
        ...prev.filter((h) => !sameRoute(h)),
      ]);
      // Pinned entries never get evicted; the cap squeezes unpinned ones
      const pinned = merged.filter((h) => h.pinned);
      const unpinned = merged.filter((h) => !h.pinned).slice(0, Math.max(0, MAX - pinned.length));
      return persistAnd(sortEntries([...pinned, ...unpinned]));
    });
  }

  function togglePin(id) {
    setHistory((prev) =>
      persistAnd(sortEntries(prev.map((h) => (h.id === id ? { ...h, pinned: !h.pinned } : h))))
    );
  }

  function removeCheck(id) {
    setHistory((prev) => persistAnd(prev.filter((h) => h.id !== id)));
  }

  return { history, addCheck, removeCheck, togglePin };
}
