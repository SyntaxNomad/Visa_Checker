import { useState } from "react";

/**
 * Interactive document checklist with a persisted readiness score.
 * Checked items are stored per route in localStorage, so progress
 * survives refreshes and re-checks.
 */
export default function ReadinessChecklist({ items, routeKey }) {
  const storageKey = `visaneed_ready_${routeKey}`;
  const [checked, setChecked] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) || "[]")); }
    catch { return new Set(); }
  });

  function toggle(item) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }

  const done = items.filter((i) => checked.has(i)).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="section-card">
      <div className="checklist-head">
        <h3 className="section-title">Your readiness checklist</h3>
        <span className={`checklist-score${pct === 100 ? " checklist-score--done" : ""}`}>
          {pct === 100 ? "✓ Travel ready" : `${pct}% ready`}
        </span>
      </div>
      <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <ul className="checklist">
        {items.map((item) => (
          <li key={item}>
            <label className={`check-item${checked.has(item) ? " check-item--done" : ""}`}>
              <input
                type="checkbox"
                checked={checked.has(item)}
                onChange={() => toggle(item)}
              />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="checklist-hint">Tick items as you gather them — your progress is saved on this device.</p>
    </div>
  );
}
