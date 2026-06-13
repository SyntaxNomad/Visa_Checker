import { useEffect, useMemo, useState } from "react";
import CountrySelect from "./CountrySelect";
import Icon from "./Icon";
import { passportSummary, GROUP_ORDER } from "../lib/dataset";
import { globalStats } from "../lib/stats";
import { STATUS_META, flag, regionOf } from "../lib/status";
import { CountUp, Reveal } from "./motion";
import { REGIONS } from "../data/regions";

const GROUP_BLURB = {
  "Visa-Free": "Just show up with a valid passport",
  "Visa on Arrival": "Get your visa at the border",
  "eVisa Available": "Apply online before you fly",
  "Visa Required": "Embassy or consulate application needed",
  "Entry Banned": "Entry is currently not permitted",
};

export default function Explorer({ passport, onChangePassport, onCheck }) {
  const [loaded, setLoaded] = useState(null); // { passport, groups }
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [region, setRegion] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    let active = true;
    globalStats().then((s) => active && setStats(s));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!passport) return;
    let active = true;
    passportSummary(passport)
      .then((g) => { if (active) setLoaded({ passport, groups: g }); })
      .catch(() => { if (active) setLoaded({ passport, groups: null }); });
    return () => { active = false; };
  }, [passport]);

  const groups = passport && loaded?.passport === passport ? loaded.groups : null;
  const loading = Boolean(passport) && (!loaded || loaded.passport !== passport);
  const power = stats && passport ? stats.passportByName.get(passport) : null;

  function handleChangePassport(name) {
    setFilter("all");
    setRegion("all");
    setQ("");
    onChangePassport(name);
  }

  const counts = useMemo(() => {
    if (!groups) return null;
    const c = Object.fromEntries(GROUP_ORDER.map((g) => [g, groups[g].length]));
    c.total = GROUP_ORDER.reduce((n, g) => n + c[g], 0);
    c.easy = c["Visa-Free"] + c["Visa on Arrival"] + c["eVisa Available"];
    return c;
  }, [groups]);

  const query = q.trim().toLowerCase();
  const visibleGroups = groups
    ? GROUP_ORDER
        .filter((g) => filter === "all" || filter === g)
        .map((g) => [g, groups[g].filter((d) =>
          (!query || d.name.toLowerCase().includes(query)) &&
          (region === "all" || regionOf(d.name) === region)
        )])
        .filter(([, list]) => list.length > 0)
    : [];

  return (
    <div className="explorer">
      <div className="explorer-head">
        <p className="section-eyebrow">Passport Explorer</p>
        <h1 className="explorer-title">Where can your passport take you?</h1>
        <p className="explorer-sub">
          Instant answers for every destination on earth, straight from the verified dataset —
          no waiting, no signup.
        </p>
        <div className="explorer-picker">
          <CountrySelect id="explorer-passport" value={passport} onChange={handleChangePassport} placeholder="Select your passport…" />
        </div>
      </div>

      {loading && (
        <div className="explorer-loading">
          <div className="spinner" aria-label="Loading" />
        </div>
      )}

      {!loading && groups && counts && (
        <>
          {power && (
            <Reveal className="power-card">
              <div className="power-main">
                <span className="power-flag">{flag(passport)}</span>
                <div>
                  <p className="power-name">{passport} passport</p>
                  <p className="power-rank">Global mobility rank <strong>#{power.rank}</strong> of {stats.passports.length}</p>
                </div>
              </div>
              <div className="power-score">
                <div className="power-score-bar">
                  <div
                    className="power-score-fill"
                    style={{ width: `${Math.round((power.easy / power.total) * 100)}%` }}
                  />
                </div>
                <p className="power-score-label">
                  Travel freedom score: <strong><CountUp value={Math.round((power.easy / power.total) * 100)} />/100</strong>
                  &nbsp;·&nbsp;{power.easy} destinations without an embassy visit
                </p>
              </div>
            </Reveal>
          )}

          <div className="explorer-stats">
            <div className="explorer-stat explorer-stat--hero">
              <span className="explorer-stat-num">{counts.easy}</span>
              <span className="explorer-stat-label">destinations without an embassy visit</span>
            </div>
            {GROUP_ORDER.map((g) => (
              <button
                key={g}
                className={`explorer-stat explorer-stat--${STATUS_META[g].color}${filter === g ? " explorer-stat--active" : ""}`}
                onClick={() => setFilter(filter === g ? "all" : g)}
              >
                <span className="explorer-stat-num">{counts[g]}</span>
                <span className="explorer-stat-label">{g}</span>
              </button>
            ))}
          </div>

          <div className="region-pills">
            <button
              className={`region-pill${region === "all" ? " region-pill--active" : ""}`}
              onClick={() => setRegion("all")}
            >
              All regions
            </button>
            {REGIONS.map((r) => (
              <button
                key={r}
                className={`region-pill${region === r ? " region-pill--active" : ""}`}
                onClick={() => setRegion(region === r ? "all" : r)}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="explorer-tools">
            <div className="explorer-search-wrap">
              <Icon name="search" size={15} className="explorer-search-icon" />
              <input
                type="search"
                className="explorer-search"
                placeholder="Search destinations…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            {(filter !== "all" || region !== "all") && (
              <button className="btn-ghost" onClick={() => { setFilter("all"); setRegion("all"); }}>
                Clear filters
              </button>
            )}
          </div>

          {visibleGroups.map(([g, list]) => (
            <section className="dest-group" key={g}>
              <div className="dest-group-head">
                <span className={`badge badge--${STATUS_META[g].color}`}>{g}</span>
                <span className="dest-group-blurb">{GROUP_BLURB[g]} · {list.length} {list.length === 1 ? "country" : "countries"}</span>
              </div>
              <div className="dest-grid">
                {list.map((d) => (
                  <button
                    key={d.name}
                    className={`dest-chip dest-chip--${STATUS_META[g].color}`}
                    disabled={!d.mappable}
                    title={d.mappable ? `Full requirements: ${passport} → ${d.name}` : "Details unavailable for this territory"}
                    onClick={() => d.mappable && onCheck(passport, "", d.name)}
                  >
                    <span className={`dest-dot dest-dot--${STATUS_META[g].color}`} />
                    {flag(d.name)} {d.name}
                  </button>
                ))}
              </div>
            </section>
          ))}

          {visibleGroups.length === 0 && (
            <p className="explorer-empty">No destinations match your filters.</p>
          )}

          <p className="explorer-note">
            Tap any country for full requirements — documents, fees, processing times, and where to apply.
          </p>
        </>
      )}

      {!loading && !groups && (
        <div className="explorer-placeholder">
          <Icon name="globe" size={44} className="placeholder-icon" />
          <p>Pick a passport above to see every destination grouped by visa status.</p>
        </div>
      )}
    </div>
  );
}
