import { useState } from "react";
import { COUNTRIES } from "../data/countries";
import PopularRoutes from "./PopularRoutes";

const RESIDENCE_STATUSES = [
  "Permanent Resident",
  "Long-term Visa (work, study, or family)",
  "Short-term / Tourist Visa",
];

export default function CheckerForm({ onCheck, recentRoutes }) {
  const [passport, setPassport] = useState("");
  const [residence, setResidence] = useState("");
  const [residenceStatus, setResidenceStatus] = useState("");
  const [destination, setDestination] = useState("");

  const canSubmit = passport && destination;

  function handleResidenceChange(e) {
    setResidence(e.target.value);
    setResidenceStatus(""); // reset status when country changes
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    const passportName = COUNTRIES.find((c) => c.code === passport)?.name || passport;
    const residenceName = residence
      ? COUNTRIES.find((c) => c.code === residence)?.name || residence
      : "";
    const destinationName = COUNTRIES.find((c) => c.code === destination)?.name || destination;
    onCheck(passportName, residenceName, destinationName, residenceStatus);
  }

  return (
    <div className="form-container">
      <div className="form-card">
        <h2 className="form-title">Check Visa Requirements</h2>
        <p className="form-subtitle">Instant visa requirements for any passport</p>
        <form onSubmit={handleSubmit} className="form">

          <div className="field">
            <label className="label" htmlFor="passport">I have a passport from</label>
            <select id="passport" className="select" value={passport} onChange={(e) => setPassport(e.target.value)}>
              <option value="">Select country...</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>

          <div className="field">
            <div className="label-row">
              <label className="label" htmlFor="residence">I currently live in</label>
              <span className="label-optional">optional</span>
            </div>
            <select id="residence" className="select" value={residence} onChange={handleResidenceChange}>
              <option value="">Skip / not specified</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
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

          <div className="field">
            <label className="label" htmlFor="destination">I want to travel to</label>
            <select id="destination" className="select" value={destination} onChange={(e) => setDestination(e.target.value)}>
              <option value="">Select country...</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            Check Visa Requirements
          </button>
        </form>
      </div>

      <PopularRoutes onCheck={onCheck} recentRoutes={recentRoutes} />
    </div>
  );
}
