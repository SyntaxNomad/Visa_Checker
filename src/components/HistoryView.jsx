import Icon from "./Icon";
import { configForLabel, flag, timeAgo } from "../lib/status";

export default function HistoryView({ history, onOpen, onRecheck, onRemove, onTogglePin, onNew }) {
  if (!history.length) {
    return (
      <div className="history history--empty">
        <Icon name="briefcase" size={44} className="placeholder-icon" />
        <h1 className="history-title">No checks yet</h1>
        <p className="history-empty-sub">
          Every visa check you run is saved here automatically — reopen results
          instantly, even offline, and re-check with one tap.
        </p>
        <button className="btn-primary btn-primary--inline" onClick={onNew}>Check your first route</button>
      </div>
    );
  }

  return (
    <div className="history">
      <div className="history-head">
        <div>
          <p className="section-eyebrow">My checks</p>
          <h1 className="history-title">Your saved results</h1>
          <p className="history-sub">Saved on this device · pinned routes never expire · {history.length} saved</p>
        </div>
        <button className="btn-secondary" onClick={onNew}>New check</button>
      </div>

      <div className="history-list">
        {history.map((h) => {
          const cfg = configForLabel(h.status);
          return (
            <div className={`history-card${h.pinned ? " history-card--pinned" : ""}`} key={h.id}>
              <button
                className={`pin-btn${h.pinned ? " pin-btn--on" : ""}`}
                onClick={() => onTogglePin(h.id)}
                title={h.pinned ? "Unpin" : "Pin — never expires"}
                aria-label={h.pinned ? "Unpin route" : "Pin route"}
              >
                <Icon name="star" size={15} />
              </button>
              <button className="history-main" onClick={() => onOpen(h)} title="Open saved result">
                <span className="history-route">
                  {flag(h.passport)} {h.passport}
                  <span className="history-route-sep"><Icon name="arrowRight" size={12} /></span>
                  {flag(h.destination)} {h.destination}
                </span>
                <span className="history-meta">
                  <span className={`badge badge--${cfg.color}`}>{cfg.label}</span>
                  {h.verified === cfg.label && (
                    <span className="history-verified"><Icon name="shield" size={11} /> verified</span>
                  )}
                  {h.residence && <span className="history-residence">residing in {h.residence}</span>}
                  <span className="history-time">checked {timeAgo(h.ts)}</span>
                </span>
              </button>
              <div className="history-actions">
                <button className="btn-ghost" onClick={() => onRecheck(h)} title="Run a fresh check">
                  <Icon name="refresh" size={12} /> Re-check
                </button>
                <button className="btn-ghost btn-ghost--danger" onClick={() => onRemove(h.id)} title="Remove from history">
                  <Icon name="x" size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
