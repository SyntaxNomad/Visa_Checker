import { COUNTRIES } from "../data/countries";

function flag(name) {
  const code = COUNTRIES.find((c) => c.name === name)?.code;
  if (!code) return "🌍";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export default function PopularRoutes({ onCheck, recentRoutes }) {
  if (!recentRoutes || recentRoutes.length === 0) return null;

  return (
    <div className="quick-section">
      <p className="quick-label">Recently checked</p>
      <div className="quick-grid">
        {recentRoutes.map((r, i) => (
          <button
            key={i}
            className="quick-card quick-card--recent"
            onClick={() => onCheck(r.passport, r.residence, r.destination)}
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
