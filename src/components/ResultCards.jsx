import { useState } from "react";
import Icon from "./Icon";
import ReadinessChecklist from "./ReadinessChecklist";
import {
  STATUS_META,
  parseResult,
  getStatusConfig,
  stripMd,
  parseLines,
  flag,
  timeAgo,
  SECTION_KEYS,
} from "../lib/status";

function renderWithLinks(text) {
  const clean = stripMd(text);
  const parts = clean.split(/(https?:\/\/[^\s,)\]]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="apply-link">{part}</a>
      : <span key={i}>{part}</span>
  );
}

function ShareButton({ selection, statusConfig, parsed }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const emoji = STATUS_META[statusConfig.label]?.emoji || "🔍";
    const statusDetail = stripMd((parsed["VISA STATUS"] || statusConfig.label).split("\n")[0]);
    const residencePart = selection.residence ? ` (${selection.residence} resident)` : "";

    const lines = [
      `${selection.passport} → ${selection.destination}${residencePart}`,
      "",
      `${emoji} ${statusDetail}`,
    ];

    const topItems = parseLines(parsed["REQUIRED DOCUMENTS"]).slice(0, 3);
    if (topItems.length) {
      lines.push("", "Documents needed:");
      topItems.forEach((d) => lines.push(`• ${d}`));
    }

    lines.push("", "visaneed.app");
    const text = lines.join("\n");

    if (navigator.share) {
      try { await navigator.share({ title: "VisaIneed", text }); } catch { /* user cancelled the share sheet */ }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <button className="btn-share" onClick={handleShare}>
      {copied ? <>✓ Copied!</> : (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share result
        </>
      )}
    </button>
  );
}

function BookmarkButton({ selection, currentVisaStatus }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | saving | saved | already | error
  const [errMsg, setErrMsg] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    if (!email) return;
    setState("saving");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          passport: selection.passport,
          residence: selection.residence || "",
          destination: selection.destination,
          residenceStatus: selection.residenceStatus || "",
          currentVisaStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrMsg(data?.error || "Something went wrong");
        setState("error");
      } else {
        setState(data.status === "already_subscribed" ? "already" : "saved");
      }
    } catch {
      setErrMsg("Network error — please try again.");
      setState("error");
    }
  }

  if (state === "saved") {
    return <p className="bookmark-saved"><Icon name="mail" size={14} /> Almost done — check your inbox and click the confirmation link to activate alerts.</p>;
  }
  if (state === "already") {
    return <p className="bookmark-saved"><Icon name="bell" size={14} /> You're already subscribed to alerts for this route.</p>;
  }

  return (
    <div className="bookmark-wrap">
      {!open ? (
        <button className="btn-bookmark" onClick={() => setOpen(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Get notified if rules change
        </button>
      ) : (
        <form className="bookmark-form" onSubmit={handleSave}>
          <input className="bookmark-input" type="email" placeholder="your@email.com"
            value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          <button type="submit" className="bookmark-submit" disabled={!email || state === "saving"}>
            {state === "saving" ? "Saving..." : "Notify me"}
          </button>
          <button type="button" className="bookmark-cancel" onClick={() => { setOpen(false); setState("idle"); }}>✕</button>
          {state === "error" && <p className="bookmark-error">{errMsg || "Something went wrong"}</p>}
        </form>
      )}
    </div>
  );
}

export default function ResultCards({ result, selection, onReset, meta, onRecheck }) {
  const parsed = parseResult(result);
  const statusConfig = getStatusConfig(parsed["VISA STATUS"]);
  const hasData = SECTION_KEYS.some((k) => parsed[k]);
  const docItems = parseLines(parsed["REQUIRED DOCUMENTS"]);
  const banned = statusConfig.type === "banned";

  if (!hasData) {
    return (
      <div className="results-container">
        <div className="fallback-card"><pre className="raw-result">{result}</pre></div>
        <div className="results-footer">
          <button className="btn-secondary" onClick={onReset}>← Check Another Country</button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">

      <div className="trip-bar">
        <div className="trip-route">
          <span className="trip-country">{flag(selection.passport)} {selection.passport}</span>
          <span className="trip-sep"><Icon name="arrowRight" size={14} /></span>
          <span className="trip-country">{flag(selection.destination)} {selection.destination}</span>
        </div>
        {selection.residence && <span className="trip-residence">Residing in {selection.residence}</span>}
      </div>

      {meta?.ts && (
        <div className="meta-row">
          <span className="meta-checked">
            {meta.fromCache ? `Saved result · checked ${timeAgo(meta.ts)}` : "Checked just now · saved to My checks"}
          </span>
          {meta.fromCache && onRecheck && (
            <button className="btn-ghost" onClick={onRecheck}><Icon name="refresh" size={12} /> Re-check now</button>
          )}
        </div>
      )}

      <div className={`verdict-banner verdict-banner--${statusConfig.color}`}>
        <div className="verdict-dot" />
        <div className="verdict-text">
          <span className="verdict-label">{statusConfig.label}</span>
          {parsed["VISA STATUS"] && <p className="verdict-detail">{stripMd(parsed["VISA STATUS"])}</p>}
        </div>
      </div>

      {meta && meta.verified !== undefined && (
        meta.verified === statusConfig.label ? (
          <div className="source-ribbon source-ribbon--verified">
            <Icon name="shield" size={15} />
            <span><strong>Verified status</strong> — matches the Passport Index dataset, cross-checked against current official sources.</span>
          </div>
        ) : meta.verified ? (
          <div className="source-ribbon source-ribbon--updated">
            <Icon name="eye" size={15} />
            <span><strong>Updated from live sources</strong> — official sources currently differ from the reference dataset (which shows “{meta.verified}”). Confirm with the embassy.</span>
          </div>
        ) : (
          <div className="source-ribbon source-ribbon--ai">
            <Icon name="alert" size={15} />
            <span><strong>AI-determined</strong> — this route isn't in the reference dataset, so the status comes from live official sources. Confirm with the embassy before booking.</span>
          </div>
        )
      )}

      <div className="info-row">
        {parsed["VISA TYPE"] && (
          <div className="info-block">
            <p className="info-label">Visa type</p>
            <p className="info-value">{stripMd(parsed["VISA TYPE"])}</p>
          </div>
        )}
        {parsed["PROCESSING TIME"] && (
          <div className="info-block">
            <p className="info-label">Processing time</p>
            <p className="info-value">{stripMd(parsed["PROCESSING TIME"])}</p>
          </div>
        )}
      </div>

      {parsed["WHERE TO APPLY"] && (
        <div className="section-card section-card--apply">
          <h3 className="section-title">How to apply</h3>
          <p className="apply-text">{renderWithLinks(parsed["WHERE TO APPLY"])}</p>
        </div>
      )}

      {banned || docItems.length === 0 ? (
        <div className="section-card">
          <h3 className="section-title">What you'll need</h3>
          {docItems.length
            ? <ul className="check-list">{docItems.map((d, i) => <li key={i}>{d}</li>)}</ul>
            : <p className="section-na">Verify documents with the official embassy website.</p>}
        </div>
      ) : (
        <ReadinessChecklist
          items={docItems}
          routeKey={`${selection.passport}|${selection.destination}|${selection.residence || ""}`}
        />
      )}

      {parsed["DISCLAIMER"] && <p className="disclaimer">{stripMd(parsed["DISCLAIMER"])}</p>}

      <div className="actions-row">
        <ShareButton selection={selection} statusConfig={statusConfig} parsed={parsed} />
        <button className="btn-bookmark btn-print" onClick={() => window.print()}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Print
        </button>
        <BookmarkButton selection={selection} currentVisaStatus={statusConfig.label} />
      </div>

      <div className="results-footer">
        <button className="btn-secondary" onClick={onReset}>← Check Another Country</button>
      </div>
    </div>
  );
}
