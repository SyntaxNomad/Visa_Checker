export default function Header({ showNav, onHome }) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <button className="nav-logo" onClick={onHome}>
          <span className="nav-logo-mark">✈</span>
          <span className="nav-logo-text">Visa<span className="nav-logo-accent">Ineed</span></span>
        </button>
        {showNav && (
          <nav className="nav-links">
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a href="#trust" className="nav-link">Why trust us</a>
            <a href="#faq" className="nav-link">FAQ</a>
            <a href="#check" className="nav-cta">Check a visa</a>
          </nav>
        )}
      </div>
    </header>
  );
}
