import Icon from "./Icon";
import { Magnetic } from "./motion";

const ITEMS = [
  { id: "explore", icon: "compass", label: "Explore" },
  { id: "compare", icon: "compare", label: "Compare" },
  { id: "trip", icon: "route", label: "Trip" },
  { id: "intel", icon: "chart", label: "Intel" },
];

export default function Header({ view, onNavigate, historyCount }) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <button className="nav-logo" onClick={() => onNavigate("home")}>
          <Icon name="plane" size={20} className="nav-logo-mark" />
          <span className="nav-logo-text">Visa<span className="nav-logo-accent">Ineed</span></span>
        </button>
        <nav className="nav-links">
          {ITEMS.map((it) => (
            <button
              key={it.id}
              className={`nav-btn${view === it.id ? " nav-btn--active" : ""}`}
              onClick={() => onNavigate(it.id)}
              title={it.label}
            >
              <Icon name={it.icon} size={15} />
              <span className="nav-btn-extra">{it.label}</span>
            </button>
          ))}
          <button
            className={`nav-btn${view === "history" ? " nav-btn--active" : ""}`}
            onClick={() => onNavigate("history")}
            title="My checks"
          >
            <Icon name="briefcase" size={15} />
            <span className="nav-btn-extra">My checks</span>
            {historyCount > 0 && <span className="nav-count">{historyCount}</span>}
          </button>
          <Magnetic>
            <button className="nav-cta" onClick={() => onNavigate("check")}>
              Check a visa
            </button>
          </Magnetic>
        </nav>
      </div>
    </header>
  );
}
