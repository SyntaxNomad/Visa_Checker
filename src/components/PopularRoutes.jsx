import { flag } from "../lib/status";

const POPULAR = [
  { passport: "India", destination: "United Arab Emirates" },
  { passport: "Nigeria", destination: "United Kingdom" },
  { passport: "Philippines", destination: "Japan" },
  { passport: "Pakistan", destination: "Canada" },
  { passport: "Egypt", destination: "Germany" },
  { passport: "Brazil", destination: "Portugal" },
];

export default function PopularRoutes({ onCheck, recentRoutes }) {
  const hasRecents = recentRoutes && recentRoutes.length > 0;
  const routes = hasRecents ? recentRoutes : POPULAR;

  return (
    <div className="quick-section">
      <p className="quick-label">{hasRecents ? "Recently checked" : "Popular checks"}</p>
      <div className="quick-grid">
        {routes.map((r, i) => (
          <button
            key={i}
            className={`quick-card${hasRecents ? " quick-card--recent" : ""}`}
            onClick={() => onCheck(r.passport, r.residence || "", r.destination)}
          >
            <span className="quick-route">
              {flag(r.passport)} {r.passport} → {flag(r.destination)} {r.destination}
            </span>
            {r.residence && (
              <span className="quick-residence">Residing in {r.residence}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
