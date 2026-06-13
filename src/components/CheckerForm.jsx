import { useEffect, useState } from "react";
import CountrySelect from "./CountrySelect";
import PopularRoutes from "./PopularRoutes";
import { lookupPassportIndex } from "../lib/dataset";
import { STATUS_META } from "../lib/status";

const RESIDENCE_STATUSES = [
  "Permanent Resident",
  "Long-term Visa (work, study, or family)",
  "Short-term / Tourist Visa",
];

export default function CheckerForm({ onCheck, recentRoutes, initialDestination = "" }) {
  const [passport, setPassport] = useState("");
  const [residence, setResidence] = useState("");
  const [residenceStatus, setResidenceStatus] = useState("");
  const [destination, setDestination] = useState(initialDestination);
  const [previewState, setPreviewState] = useState(null); // { route, status }

  const canSubmit = passport && destination;
  const route = passport && destination && passport !== destination
    ? `${passport}|${destination}`
    : null;

  // Instant verified answer from the dataset, before any AI call
  useEffect(() => {
    if (!route) return;
    let active = true;
    lookupPassportIndex(passport, destination).then((status) => {
      if (active) setPreviewState({ route, status });
    });
    return () => { active = false; };
  }, [route, passport, destination]);

  const preview = route && previewState?.route === route ? previewState.status : null;

  function swap() {
    setPassport(destination);
    setDestination(passport);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onCheck(passport, residence, destination, residenceStatus);
  }

  const previewMeta = preview ? STATUS_META[preview] : null;

  return (
    <div className="form-container">
      <div className="form-card">
        <h2 className="form-title">Where to next?</h2>
        <p className="form-subtitle">Takes about ten seconds — no signup needed</p>
        <form onSubmit={handleSubmit} className="form">

          <div className="field">
            <label className="label" htmlFor="passport">I have a passport from</label>
            <CountrySelect id="passport" value={passport} onChange={setPassport} placeholder="Type to search…" />
          </div>

          <div className="swap-row">
            <button
              type="button"
              className="swap-btn"
              onClick={swap}
              disabled={!passport && !destination}
              aria-label="Swap passport and destination"
              title="Swap passport and destination"
            >
              ⇅
            </button>
          </div>

          <div className="field">
            <label className="label" htmlFor="destination">I want to travel to</label>
            <CountrySelect id="destination" value={destination} onChange={setDestination} placeholder="Type to search…" />
          </div>

          <div className="field">
            <div className="label-row">
              <label className="label" htmlFor="residence">I currently live in</label>
              <span className="label-optional">optional — can unlock easier visas</span>
            </div>
            <CountrySelect
              id="residence"
              value={residence}
              onChange={(v) => { setResidence(v); setResidenceStatus(""); }}
              placeholder="Skip / not specified"
              clearable
            />
          </div>

          {residence && (
            <div className="field field--indented">
              <label className="label" htmlFor="residenceStatus">What is your status there?</label>
              <select
                id="residenceStatus"
                className="select"
                value={residenceStatus}
                onChange={(e) => setResidenceStatus(e.target.value)}
              >
                <option value="">Select status...</option>
                {RESIDENCE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {previewMeta && (
            <div className={`preview-chip preview-chip--${previewMeta.color}`}>
              <span className={`preview-dot dest-dot--${previewMeta.color}`} />
              <span>
                <strong>{preview}</strong> — verified dataset answer.
                Get documents, fees &amp; where to apply below.
              </span>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {previewMeta ? "Get the full requirements" : "Check Visa Requirements"}
          </button>
        </form>
      </div>

      <PopularRoutes onCheck={onCheck} recentRoutes={recentRoutes} />
    </div>
  );
}
