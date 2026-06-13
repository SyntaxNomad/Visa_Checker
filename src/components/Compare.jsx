import { useEffect, useState } from "react";
import CountrySelect from "./CountrySelect";
import Icon from "./Icon";
import { globalStats, passportAdvantages } from "../lib/stats";
import { STATUS_META, flag } from "../lib/status";
import { CountUp, Reveal, TiltCard } from "./motion";

const CATS = [
  { key: "free", label: "Visa-Free", color: "green" },
  { key: "voa", label: "Visa on Arrival", color: "orange" },
  { key: "evisa", label: "eVisa", color: "blue" },
  { key: "required", label: "Visa Required", color: "red" },
  { key: "banned", label: "Entry Banned", color: "black" },
];

function Gauge({ pct, label }) {
  const RADIUS = 56;
  const C = 2 * Math.PI * RADIUS;
  return (
    <div className="gauge">
      <svg viewBox="0 0 140 140" className="gauge-svg">
        <circle cx="70" cy="70" r={RADIUS} className="gauge-track" />
        <circle
          cx="70" cy="70" r={RADIUS}
          className="gauge-fill"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct / 100)}
        />
      </svg>
      <div className="gauge-center">
        <span className="gauge-num"><CountUp value={pct} />%</span>
        <span className="gauge-label">{label}</span>
      </div>
    </div>
  );
}

function PassportCard({ data, side }) {
  return (
    <TiltCard className={`pp-card pp-card--${side}`}>
      <div className="pp-card-head">
        <span className="pp-flag">{flag(data.name)}</span>
        <div>
          <h3 className="pp-name">{data.name}</h3>
          <p className="pp-rank">Global mobility rank <strong>#{data.rank}</strong></p>
        </div>
      </div>
      <Gauge pct={Math.round((data.easy / data.total) * 100)} label="world unlocked" />
      <div className="pp-mini-stats">
        <div><span className="pp-mini-num"><CountUp value={data.easy} /></span><span className="pp-mini-label">no embassy needed</span></div>
        <div><span className="pp-mini-num"><CountUp value={data.total} /></span><span className="pp-mini-label">destinations tracked</span></div>
      </div>
    </TiltCard>
  );
}

export default function Compare({ onCheck }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [stats, setStats] = useState(null);
  const [adv, setAdv] = useState(null); // { key, winsA, winsB }

  useEffect(() => {
    let active = true;
    globalStats().then((s) => active && setStats(s));
    return () => { active = false; };
  }, []);

  const pairKey = a && b && a !== b ? `${a}|${b}` : null;

  useEffect(() => {
    if (!pairKey) return;
    let active = true;
    Promise.all([passportAdvantages(a, b), passportAdvantages(b, a)]).then(([winsA, winsB]) => {
      if (active) setAdv({ key: pairKey, winsA, winsB });
    });
    return () => { active = false; };
  }, [pairKey, a, b]);

  const da = stats && a ? stats.passportByName.get(a) : null;
  const db = stats && b ? stats.passportByName.get(b) : null;
  const ready = da && db && a !== b;
  const advReady = ready && adv?.key === pairKey;

  return (
    <div className="compare">
      <div className="compare-head">
        <p className="section-eyebrow">Passport Power Simulator</p>
        <h1 className="compare-title">Two passports. Head to head.</h1>
        <p className="compare-sub">
          Mobility scores, world rankings, and exactly where each passport wins —
          computed live from the verified dataset.
        </p>
      </div>

      <div className="compare-pickers">
        <div className="compare-picker">
          <label className="label" htmlFor="cmp-a">Passport A</label>
          <CountrySelect id="cmp-a" value={a} onChange={setA} placeholder="Select passport…" />
        </div>
        <div className="compare-vs">VS</div>
        <div className="compare-picker">
          <label className="label" htmlFor="cmp-b">Passport B</label>
          <CountrySelect id="cmp-b" value={b} onChange={setB} placeholder="Select passport…" />
        </div>
      </div>

      {a && b && a === b && (
        <p className="compare-hint">Pick two different passports to compare.</p>
      )}

      {!ready && !(a && b) && (
        <div className="compare-placeholder">
          <Icon name="compare" size={44} className="placeholder-icon" />
          <p>Select two passports to simulate their global power side by side.</p>
        </div>
      )}

      {ready && (
        <>
          <div className="pp-grid">
            <PassportCard data={da} side="a" />
            <PassportCard data={db} side="b" />
          </div>

          <Reveal className="versus-card">
            <h3 className="versus-title">Category breakdown</h3>
            {CATS.map(({ key, label, color }) => {
              const va = da[key];
              const vb = db[key];
              const max = Math.max(va, vb, 1);
              return (
                <div className="versus-row" key={key}>
                  <span className={`versus-num${va >= vb ? " versus-num--lead" : ""}`}>{va}</span>
                  <div className="versus-bars">
                    <div className="versus-bar versus-bar--a">
                      <div className={`versus-fill versus-fill--${color}`} style={{ width: `${(va / max) * 100}%` }} />
                    </div>
                    <span className="versus-label">{label}</span>
                    <div className="versus-bar versus-bar--b">
                      <div className={`versus-fill versus-fill--${color}`} style={{ width: `${(vb / max) * 100}%` }} />
                    </div>
                  </div>
                  <span className={`versus-num${vb >= va ? " versus-num--lead" : ""}`}>{vb}</span>
                </div>
              );
            })}
          </Reveal>

          {advReady && (
            <div className="adv-grid">
              {[{ who: a, wins: adv.winsA }, { who: b, wins: adv.winsB }].map(({ who, wins }) => (
                <Reveal className="adv-card" key={who}>
                  <h3 className="adv-title">
                    {flag(who)} Where <strong>{who}</strong> wins
                    <span className="adv-count">{wins.length}</span>
                  </h3>
                  {wins.length === 0 ? (
                    <p className="adv-empty">No destinations with strictly easier access.</p>
                  ) : (
                    <div className="adv-chips">
                      {wins.slice(0, 14).map((wn) => (
                        <button
                          key={wn.dest}
                          className="dest-chip"
                          title={`${who}: ${wn.a} · other: ${wn.b}`}
                          onClick={() => onCheck(who, "", wn.dest)}
                        >
                          <span className={`dest-dot dest-dot--${STATUS_META[wn.a].color}`} />
                          {flag(wn.dest)} {wn.dest}
                        </button>
                      ))}
                      {wins.length > 14 && <span className="adv-more">+{wins.length - 14} more</span>}
                    </div>
                  )}
                </Reveal>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
