import { useState } from "react";

const SECTION_KEYS = ["VISA STATUS", "VISA TYPE", "PROCESSING TIME", "WHERE TO APPLY", "REQUIRED DOCUMENTS", "DISCLAIMER"];

const STATUS_EMOJI = { free: "✅", evisa: "🔵", arrival: "🟡", required: "❌", banned: "🚫", unknown: "🔍" };

function parseResult(text) {
  const parsed = {};
  const parts = text.split(/\*\*\s*([A-Z][A-Z\s]{2,}?)\s*\*\*\s*:?\s*/);
  for (let i = 1; i < parts.length - 1; i += 2) {
    const key = parts[i].trim().toUpperCase();
    const content = (parts[i + 1] || "").trim();
    if (SECTION_KEYS.includes(key)) {
      parsed[key] = content || null;
    }
  }
  return parsed;
}

function getStatusConfig(text) {
  if (!text) return { type: "unknown", label: "Check Details", color: "gray" };
  const lower = text.toLowerCase();
  const firstLine = lower.split("\n")[0];
  if (firstLine.includes("entry banned") || firstLine.includes("banned") || firstLine.includes("prohibited") || firstLine.includes("not permitted")) {
    return { type: "banned", label: "Entry Banned", color: "black" };
  }
  if (firstLine.includes("visa-free") || firstLine.includes("visa free") || firstLine.includes("no visa")) {
    return { type: "free", label: "Visa-Free", color: "green" };
  }
  if (firstLine.includes("evisa available") || firstLine.includes("e-visa available")) {
    return { type: "evisa", label: "eVisa Available", color: "blue" };
  }
  if (firstLine.includes("visa on arrival")) {
    return { type: "arrival", label: "Visa on Arrival", color: "orange" };
  }
  if (firstLine.includes("visa required") || firstLine.includes("required")) {
    return { type: "required", label: "Visa Required", color: "red" };
  }
  return { type: "unknown", label: "Check Details", color: "gray" };
}

function strip(text) {
  return text.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function renderLines(text) {
  if (!text) return null;
  return text.split("\n")
    .map((line) => strip(line).replace(/^\d+\.\s*/, "").replace(/^[-•]\s*/, "").trim())
    .filter(Boolean)
    .map((line, i) => <li key={i}>{line}</li>);
}

function renderWithLinks(text) {
  const clean = strip(text);
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
    const emoji = STATUS_EMOJI[statusConfig.type] || "🔍";
    const statusDetail = strip((parsed["VISA STATUS"] || statusConfig.label).split("\n")[0]);
    const residencePart = selection.residence ? ` (${selection.residence} resident)` : "";

    const lines = [
      `${selection.passport} → ${selection.destination}${residencePart}`,
      "",
      `${emoji} ${statusDetail}`,
    ];

    const docs = parsed["REQUIRED DOCUMENTS"];
    if (docs) {
      const topItems = docs.split("\n")
        .map((l) => strip(l).replace(/^\d+\.\s*/, "").replace(/^[-•]\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 3);
      if (topItems.length) {
        lines.push("", "Documents needed:");
        topItems.forEach((d) => lines.push(`• ${d}`));
      }
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
  const [state, setState] = useState("idle"); // idle | saving | saved | error
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
    return <p className="bookmark-saved">📬 Almost done — check your inbox and click the confirmation link to activate alerts.</p>;
  }
  if (state === "already") {
    return <p className="bookmark-saved">🔔 You're already subscribed to alerts for this route.</p>;
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

export default function ResultCards({ result, selection, onReset }) {
  const parsed = parseResult(result);
  const statusConfig = getStatusConfig(parsed["VISA STATUS"]);
  const hasData = SECTION_KEYS.some((k) => parsed[k]);

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
          <span className="trip-country">{selection.passport}</span>
          <span className="trip-sep">✈</span>
          <span className="trip-country">{selection.destination}</span>
        </div>
        {selection.residence && <span className="trip-residence">Residing in {selection.residence}</span>}
      </div>

      <div className={`verdict-banner verdict-banner--${statusConfig.color}`}>
        <div className="verdict-dot" />
        <div className="verdict-text">
          <span className="verdict-label">{statusConfig.label}</span>
          {parsed["VISA STATUS"] && <p className="verdict-detail">{strip(parsed["VISA STATUS"])}</p>}
        </div>
      </div>

      <div className="info-row">
        {parsed["VISA TYPE"] && (
          <div className="info-block">
            <p className="info-label">Visa type</p>
            <p className="info-value">{strip(parsed["VISA TYPE"])}</p>
          </div>
        )}
        {parsed["PROCESSING TIME"] && (
          <div className="info-block">
            <p className="info-label">Processing time</p>
            <p className="info-value">{strip(parsed["PROCESSING TIME"])}</p>
          </div>
        )}
      </div>

      {parsed["WHERE TO APPLY"] && (
        <div className="section-card section-card--apply">
          <h3 className="section-title">How to apply</h3>
          <p className="apply-text">{renderWithLinks(parsed["WHERE TO APPLY"])}</p>
        </div>
      )}

      <div className="section-card">
        <h3 className="section-title">What you'll need</h3>
        {parsed["REQUIRED DOCUMENTS"]
          ? <ul className="check-list">{renderLines(parsed["REQUIRED DOCUMENTS"])}</ul>
          : <p className="section-na">Verify documents with the official embassy website.</p>}
      </div>

      {parsed["DISCLAIMER"] && <p className="disclaimer">{strip(parsed["DISCLAIMER"])}</p>}

      <div className="actions-row">
        <ShareButton selection={selection} statusConfig={statusConfig} parsed={parsed} />
        <BookmarkButton selection={selection} currentVisaStatus={statusConfig.label} />
      </div>

      <div className="results-footer">
        <button className="btn-secondary" onClick={onReset}>← Check Another Country</button>
      </div>
    </div>
  );
}
