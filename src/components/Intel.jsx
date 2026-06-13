import { useEffect, useState } from "react";
import { globalStats } from "../lib/stats";
import { flag } from "../lib/status";
import { CountUp, Reveal } from "./motion";

function RankList({ title, blurb, rows, valueOf, unit, barColor, onPick }) {
  // Scale bars to the range within the list, not from zero — otherwise
  // closely-ranked lists render as identical full-width bars.
  const vals = rows.map(valueOf);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals);
  const widthOf = (v) => (max === min ? 100 : 14 + (86 * (v - min)) / (max - min));
  return (
    <Reveal className="intel-panel">
      <div className="intel-panel-head">
        <h3 className="intel-panel-title">{title}</h3>
        <p className="intel-panel-blurb">{blurb}</p>
      </div>
      <div className="intel-rows">
        {rows.map((r, i) => (
          <button className="intel-row" key={r.name} onClick={() => onPick?.(r.name)} title={r.name}>
            <span className="intel-rank">{i + 1}</span>
            <span className="intel-country">{flag(r.name)} {r.name}</span>
            <span className="intel-bar">
              <span
                className={`intel-bar-fill intel-bar-fill--${barColor}`}
                style={{ width: `${widthOf(valueOf(r))}%`, transitionDelay: `${i * 60}ms` }}
              />
            </span>
            <span className="intel-value">{valueOf(r)} <em>{unit}</em></span>
          </button>
        ))}
      </div>
    </Reveal>
  );
}

export default function Intel({ onExplorePassport, onCheckDestination }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    globalStats().then((s) => active && setStats(s));
    return () => { active = false; };
  }, []);

  if (!stats) {
    return (
      <div className="intel intel--loading">
        <div className="intel-skeleton-grid">
          {Array.from({ length: 4 }).map((_, i) => <div className="skeleton skeleton--counter" key={i} />)}
        </div>
        <div className="skeleton skeleton--panel" />
        <div className="skeleton skeleton--panel" />
      </div>
    );
  }

  const { totals, passports, welcoming, fortress } = stats;
  const openPct = Math.round(((totals.free + totals.voa + totals.evisa) / totals.corridors) * 100);

  return (
    <div className="intel">
      <div className="intel-head">
        <p className="intel-eyebrow"><span className="intel-live-dot" /> Live · verified dataset · re-checked daily 08:00 UTC</p>
        <h1 className="intel-title">Global Travel Intelligence</h1>
        <p className="intel-sub">
          The state of world mobility right now — every passport, every border, one screen.
        </p>
      </div>

      <div className="intel-counters">
        <Reveal className="intel-counter" delay={0}>
          <span className="intel-counter-num"><CountUp value={totals.corridors} /></span>
          <span className="intel-counter-label">travel corridors tracked</span>
        </Reveal>
        <Reveal className="intel-counter intel-counter--green" delay={80}>
          <span className="intel-counter-num"><CountUp value={totals.free} /></span>
          <span className="intel-counter-label">visa-free corridors</span>
        </Reveal>
        <Reveal className="intel-counter intel-counter--blue" delay={160}>
          <span className="intel-counter-num"><CountUp value={totals.evisa + totals.voa} /></span>
          <span className="intel-counter-label">eVisa / on-arrival corridors</span>
        </Reveal>
        <Reveal className="intel-counter intel-counter--red" delay={240}>
          <span className="intel-counter-num"><CountUp value={totals.required} /></span>
          <span className="intel-counter-label">embassy-required corridors</span>
        </Reveal>
      </div>

      <Reveal className="intel-meter">
        <div className="intel-meter-top">
          <span>World openness index</span>
          <strong><CountUp value={openPct} />% of all corridors need no embassy visit</strong>
        </div>
        <div className="intel-meter-bar">
          <div className="intel-meter-fill" style={{ width: `${openPct}%` }} />
        </div>
      </Reveal>

      <div className="intel-grid">
        <RankList
          title="Most powerful passports"
          blurb="Destinations reachable without an embassy application"
          rows={passports.slice(0, 8)}
          valueOf={(r) => r.easy}
          unit="dest."
          barColor="green"
          onPick={onExplorePassport}
        />
        <RankList
          title="Most welcoming destinations"
          blurb="Passports admitted visa-free, on arrival, or by eVisa"
          rows={welcoming.slice(0, 8)}
          valueOf={(r) => r.open}
          unit="passports"
          barColor="blue"
          onPick={onCheckDestination}
        />
        <RankList
          title="Hardest borders to cross"
          blurb="Passports that must apply in advance — or can't enter at all"
          rows={fortress.slice(0, 8)}
          valueOf={(r) => r.required + r.banned}
          unit="passports"
          barColor="red"
          onPick={onCheckDestination}
        />
        <Reveal className="intel-panel intel-panel--monitor">
          <div className="intel-panel-head">
            <h3 className="intel-panel-title">Change monitor</h3>
            <p className="intel-panel-blurb">How VisaIneed keeps this picture current</p>
          </div>
          <ul className="intel-monitor">
            <li><span className="intel-live-dot" /> Every subscribed route re-verified daily at 08:00 UTC</li>
            <li><span className="intel-tick">✓</span> Changes must hold multiple consecutive days before they count</li>
            <li><span className="intel-tick">✓</span> Corroborated against official government sources</li>
            <li><span className="intel-tick">✓</span> Confirmed changes alert subscribers — never false alarms</li>
          </ul>
          <p className="intel-monitor-note">Tap any passport or destination above to drill in.</p>
        </Reveal>
      </div>

      <p className="intel-source">Source: Passport Index open dataset · aggregated live in your browser · {stats.passports.length} passports × {stats.destinations.length} destinations</p>
    </div>
  );
}
