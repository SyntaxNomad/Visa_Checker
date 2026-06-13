const STEPS = [
  {
    n: "1",
    title: "Tell us your trip",
    body: "Pick your passport and destination — and optionally where you live, since residence permits can unlock easier options.",
  },
  {
    n: "2",
    title: "We verify it",
    body: "Your route is checked against a verified visa dataset, then enriched with current details from official government sources.",
  },
  {
    n: "3",
    title: "Travel ready",
    body: "Get your visa status, required documents, fees, processing times, and exactly where to apply — in seconds.",
  },
];

import { Reveal, TiltCard } from "./motion";

export default function HowItWorks() {
  return (
    <section className="section" id="how-it-works">
      <Reveal>
        <p className="section-eyebrow">How it works</p>
        <h2 className="section-heading">Three steps to certainty</h2>
      </Reveal>
      <div className="steps-grid">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 120}>
            <TiltCard className="step-card">
              <div className="step-number">{s.n}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-body">{s.body}</p>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
