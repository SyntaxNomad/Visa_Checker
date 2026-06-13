import { useEffect, useState } from "react";
import CountrySelect from "./CountrySelect";
import Icon from "./Icon";
import { lookupPassportIndex } from "../lib/dataset";
import { STATUS_META, flag } from "../lib/status";
import { Reveal } from "./motion";

const MAX_STOPS = 8;

const ADVANCE_NEEDED = new Set(["Visa Required", "eVisa Available"]);

function verdictFor(legs) {
  const known = legs.filter((l) => l.status);
  const embassy = known.filter((l) => l.status === "Visa Required").length;
  const banned = known.filter((l) => l.status === "Entry Banned").length;
  const evisa = known.filter((l) => l.status === "eVisa Available").length;

  if (banned > 0) {
    return {
      level: "blocked",
      title: "Trip blocked as planned",
      body: "At least one stop currently bans entry for this passport. Remove it or check full details for possible exceptions.",
    };
  }
  if (embassy >= 2) {
    return {
      level: "hard",
      title: "Plan 2–3 months ahead",
      body: `${embassy} stops need embassy applications. Start with the slowest one — appointment waits stack up fast.`,
    };
  }
  if (embassy === 1) {
    return {
      level: "moderate",
      title: "One embassy visit required",
      body: "Apply for that visa first — everything else on this itinerary can be handled online or at the border.",
    };
  }
  if (evisa > 0) {
    return {
      level: "easy",
      title: "No embassy visits needed",
      body: `Apply for ${evisa} eVisa${evisa > 1 ? "s" : ""} online a week or two before departure and you're set.`,
    };
  }
  return {
    level: "free",
    title: "Grab your passport and go",
    body: "Every stop is visa-free or visa on arrival for this passport. Check entry documents before flying.",
  };
}

export default function Trip({ onCheck }) {
  const [passport, setPassport] = useState("");
  const [stops, setStops] = useState(["", ""]);
  const [statuses, setStatuses] = useState({}); // `${passport}|${dest}` -> status|null

  const activeStops = stops.filter(Boolean);

  useEffect(() => {
    if (!passport) return;
    let active = true;
    for (const dest of activeStops) {
      const key = `${passport}|${dest}`;
      if (key in statuses) continue;
      lookupPassportIndex(passport, dest).then((s) => {
        if (active) setStatuses((prev) => ({ ...prev, [key]: s }));
      });
    }
    return () => { active = false; };
  }, [passport, activeStops, statuses]);

  function setStop(i, value) {
    setStops((prev) => prev.map((s, j) => (j === i ? value : s)));
  }

  function removeStop(i) {
    setStops((prev) => prev.filter((_, j) => j !== i));
  }

  const legs = passport
    ? activeStops.map((dest) => ({ dest, status: statuses[`${passport}|${dest}`] }))
    : [];
  const ready = passport && legs.length >= 2 && legs.every((l) => l.status !== undefined);
  const verdict = ready ? verdictFor(legs) : null;
  const advanceLegs = ready ? legs.filter((l) => ADVANCE_NEEDED.has(l.status)) : [];

  return (
    <div className="trip">
      <div className="trip-head">
        <p className="section-eyebrow">Trip Planner</p>
        <h1 className="trip-title">One itinerary. Every visa, at once.</h1>
        <p className="trip-sub">
          Planning a multi-country trip? See the visa picture for the whole route in one screen —
          and exactly which stops need paperwork before you book flights.
        </p>
      </div>

      <div className="trip-builder">
        <div className="trip-passport">
          <label className="label" htmlFor="trip-passport">Traveling on</label>
          <CountrySelect id="trip-passport" value={passport} onChange={setPassport} placeholder="Select passport…" />
        </div>

        <div className="trip-stops">
          {stops.map((stop, i) => {
            const status = passport && stop ? statuses[`${passport}|${stop}`] : undefined;
            const meta = status ? STATUS_META[status] : null;
            return (
              <div className="trip-stop" key={i}>
                <span className="trip-stop-n">{i + 1}</span>
                <div className="trip-stop-select">
                  <CountrySelect
                    id={`trip-stop-${i}`}
                    value={stop}
                    onChange={(v) => setStop(i, v)}
                    placeholder={`Stop ${i + 1}…`}
                  />
                </div>
                {meta && (
                  <span className={`badge badge--${meta.color} trip-stop-badge`}>{status}</span>
                )}
                {passport && stop && status === null && (
                  <span className="badge badge--gray trip-stop-badge">Check details</span>
                )}
                {stops.length > 2 && (
                  <button className="btn-ghost btn-ghost--danger trip-stop-remove" onClick={() => removeStop(i)} aria-label="Remove stop">
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
            );
          })}
          {stops.length < MAX_STOPS && (
            <button className="trip-add" onClick={() => setStops((p) => [...p, ""])}>
              <Icon name="plus" size={14} /> Add stop
            </button>
          )}
        </div>
      </div>

      {!passport && (
        <div className="explorer-placeholder">
          <Icon name="route" size={44} className="placeholder-icon" />
          <p>Pick your passport and at least two stops to analyze the whole route.</p>
        </div>
      )}

      {verdict && (
        <Reveal className={`trip-verdict trip-verdict--${verdict.level}`}>
          <div className="trip-verdict-icon">
            <Icon name={verdict.level === "blocked" ? "alert" : verdict.level === "free" ? "check" : "clock"} size={20} />
          </div>
          <div>
            <h3 className="trip-verdict-title">{verdict.title}</h3>
            <p className="trip-verdict-body">{verdict.body}</p>
          </div>
        </Reveal>
      )}

      {ready && (
        <div className="trip-legs">
          {legs.map(({ dest, status }) => {
            const meta = status ? STATUS_META[status] : null;
            return (
              <Reveal className="trip-leg" key={dest}>
                <div className="trip-leg-route">
                  <span className="trip-leg-flag">{flag(dest)}</span>
                  <div>
                    <p className="trip-leg-dest">{dest}</p>
                    <p className="trip-leg-note">
                      {status === null
                        ? "Not in dataset — run a full check"
                        : ADVANCE_NEEDED.has(status)
                          ? status === "Visa Required" ? "Apply before booking — embassy processing takes weeks" : "Apply online before departure"
                          : status === "Entry Banned" ? "Entry not permitted for this passport"
                          : "No application needed before you fly"}
                    </p>
                  </div>
                </div>
                <div className="trip-leg-actions">
                  {meta
                    ? <span className={`badge badge--${meta.color}`}>{status}</span>
                    : <span className="badge badge--gray">Unknown</span>}
                  <button className="btn-ghost" onClick={() => onCheck(passport, "", dest)}>
                    Full details <Icon name="arrowRight" size={12} />
                  </button>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}

      {ready && advanceLegs.length > 0 && (
        <Reveal className="trip-todo">
          <h3 className="trip-todo-title"><Icon name="clock" size={15} /> Before you book</h3>
          <ol className="trip-todo-list">
            {advanceLegs
              .sort((a, b) => (a.status === "Visa Required" ? -1 : 1) - (b.status === "Visa Required" ? -1 : 1))
              .map((l) => (
                <li key={l.dest}>
                  <strong>{l.dest}</strong> — {l.status === "Visa Required"
                    ? "book an embassy appointment and gather documents now"
                    : "submit the eVisa application online"}
                </li>
              ))}
          </ol>
        </Reveal>
      )}
    </div>
  );
}
