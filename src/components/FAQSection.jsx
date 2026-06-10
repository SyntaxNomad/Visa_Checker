const FAQS = [
  {
    q: "How accurate is the visa information?",
    a: "Each route is anchored to the open Passport Index dataset and enriched with live details from official government sources. Rules do change, so always confirm with the embassy or official portal before booking — we link you straight to them.",
  },
  {
    q: "Does my residence country change my options?",
    a: "Often, yes. Residents of certain countries qualify for eVisas, visa waivers, or simpler processes regardless of their passport. Add where you live and your residency status, and the result accounts for it.",
  },
  {
    q: "How do change alerts work?",
    a: "Subscribe to a route and we re-verify it every day. A detected change must hold across multiple consecutive checks and be corroborated against official sources before we email you — so an alert means something genuinely changed.",
  },
  {
    q: "Is VisaIneed free?",
    a: "Yes — checking visa requirements and subscribing to change alerts are free.",
  },
  {
    q: "Do I need an account?",
    a: "No. Check any route instantly. For change alerts you only confirm your email once via the link we send you.",
  },
];

export default function FAQSection() {
  return (
    <section className="section" id="faq">
      <p className="section-eyebrow">FAQ</p>
      <h2 className="section-heading">Questions, answered</h2>
      <div className="faq-list">
        {FAQS.map((f) => (
          <details className="faq-item" key={f.q}>
            <summary className="faq-q">{f.q}</summary>
            <p className="faq-a">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
