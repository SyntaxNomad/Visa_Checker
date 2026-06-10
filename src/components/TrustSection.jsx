const POINTS = [
  {
    icon: "🗂",
    title: "Anchored to verified data",
    body: "Every status starts from the open Passport Index dataset covering 190+ passports — not an AI guess.",
  },
  {
    icon: "🔎",
    title: "Checked against official sources",
    body: "Documents, fees, and application steps are pulled live from government portals and embassy pages.",
  },
  {
    icon: "📅",
    title: "Alerts that don't cry wolf",
    body: "A rule change must hold for multiple consecutive daily checks and be corroborated before we ever email you.",
  },
  {
    icon: "✉️",
    title: "Your inbox, protected",
    body: "Alerts are double opt-in — nobody can subscribe your email but you, and you can leave any time.",
  },
];

export default function TrustSection() {
  return (
    <section className="section section--tinted" id="trust">
      <p className="section-eyebrow">Why trust us</p>
      <h2 className="section-heading">Built for decisions that matter</h2>
      <p className="section-sub">
        Visa mistakes cost flights, fees, and sometimes the trip itself. We engineered VisaIneed
        so you never act on stale or invented information.
      </p>
      <div className="trust-grid">
        {POINTS.map((p) => (
          <div className="trust-card" key={p.title}>
            <div className="trust-icon">{p.icon}</div>
            <h3 className="trust-title">{p.title}</h3>
            <p className="trust-body">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
