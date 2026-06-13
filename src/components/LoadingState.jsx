import { useEffect, useState } from "react";
import { lookupPassportIndex } from "../lib/dataset";
import { STATUS_META, flag } from "../lib/status";

const STAGES = [
  "Checking the verified visa dataset",
  "Consulting official government sources",
  "Compiling documents, fees & timelines",
];

export default function LoadingState({ selection }) {
  const [stage, setStage] = useState(0);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 1400);
    const t2 = setTimeout(() => setStage(2), 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    let active = true;
    if (selection.passport && selection.destination) {
      lookupPassportIndex(selection.passport, selection.destination).then((s) => {
        if (active) setPreview(s);
      });
    }
    return () => { active = false; };
  }, [selection]);

  const previewMeta = preview ? STATUS_META[preview] : null;

  return (
    <div className="loading-container">
      <div className="loading-card">
        <div className="spinner" aria-label="Loading" />
        <h2 className="loading-title">Checking your route</h2>
        {selection.passport && (
          <p className="loading-sub">
            {flag(selection.passport)} {selection.passport} → {flag(selection.destination)} {selection.destination}
          </p>
        )}

        {previewMeta && (
          <div className={`preview-chip preview-chip--${previewMeta.color} preview-chip--center`}>
            <span className={`preview-dot dest-dot--${previewMeta.color}`} />
            <span><strong>{preview}</strong> — confirmed. Fetching the details…</span>
          </div>
        )}

        <ul className="stage-list">
          {STAGES.map((label, i) => (
            <li key={label} className={`stage ${i < stage ? "stage--done" : i === stage ? "stage--active" : ""}`}>
              <span className="stage-mark">{i < stage ? "✓" : ""}</span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
