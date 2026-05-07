import { useState } from "react";

const RECENT_KEY = "visaneed_recent";
const BOOKMARK_KEY = "visaneed_bookmarks";

function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
}

export function useRecentRoutes() {
  const [recentRoutes, setRecentRoutes] = useState(() => load(RECENT_KEY));
  const [bookmarks, setBookmarks] = useState(() => load(BOOKMARK_KEY));

  function addRoute(passport, residence, destination) {
    setRecentRoutes((prev) => {
      const filtered = prev.filter(
        (r) => !(r.passport === passport && r.residence === residence && r.destination === destination)
      );
      const next = [{ passport, residence, destination, ts: Date.now() }, ...filtered].slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }

  function addBookmark(passport, residence, destination, email) {
    setBookmarks((prev) => {
      const filtered = prev.filter(
        (b) => !(b.passport === passport && b.residence === residence && b.destination === destination)
      );
      const next = [{ passport, residence, destination, email, ts: Date.now() }, ...filtered];
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
      return next;
    });
  }

  function isBookmarked(passport, residence, destination) {
    return bookmarks.some(
      (b) => b.passport === passport && b.residence === residence && b.destination === destination
    );
  }

  return { recentRoutes, addRoute, bookmarks, addBookmark, isBookmarked };
}
