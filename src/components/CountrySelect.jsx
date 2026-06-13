import { useEffect, useRef, useState } from "react";
import { COUNTRIES } from "../data/countries";
import { flag } from "../lib/status";

/**
 * Searchable country picker: type to filter, arrow keys to move,
 * Enter to select, Escape to close. Value is the country name.
 */
export default function CountrySelect({ id, value, onChange, placeholder, clearable }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? COUNTRIES
        .filter((c) => c.name.toLowerCase().includes(q))
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
          const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
          return aStarts - bStarts || a.name.localeCompare(b.name);
        })
    : COUNTRIES;

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    listRef.current?.children[hi]?.scrollIntoView({ block: "nearest" });
  }, [hi, open]);

  function select(name) {
    onChange(name);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[hi]) select(filtered[hi].name);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className="cs-wrap" ref={wrapRef}>
      {value && !open && <span className="cs-flag">{flag(value)}</span>}
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        className={`cs-input${value && !open ? " cs-input--filled" : ""}`}
        placeholder={value && !open ? undefined : placeholder}
        value={open ? query : value || ""}
        onFocus={() => { setOpen(true); setHi(0); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0); }}
        onKeyDown={onKeyDown}
      />
      {clearable && value && !open && (
        <button type="button" className="cs-clear" aria-label="Clear" onClick={() => onChange("")}>✕</button>
      )}
      {open && (
        <ul className="cs-list" ref={listRef} role="listbox">
          {filtered.length === 0 && <li className="cs-empty">No countries match “{query}”</li>}
          {filtered.map((c, i) => (
            <li
              key={c.code}
              role="option"
              aria-selected={c.name === value}
              className={`cs-item${i === hi ? " cs-item--hi" : ""}${c.name === value ? " cs-item--selected" : ""}`}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => { e.preventDefault(); select(c.name); }}
            >
              <span className="cs-item-flag">{flag(c.name)}</span>
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
