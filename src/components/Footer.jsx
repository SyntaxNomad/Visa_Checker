export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">Visa<span className="footer-logo-accent">Ineed</span></span>
          <p className="footer-blurb">
            Instant, verified visa requirements for any passport and destination —
            with alerts that only fire when the rules really change.
          </p>
        </div>
        <div className="footer-col">
          <p className="footer-col-title">Product</p>
          <a href="#check" className="footer-link">Check a visa</a>
          <a href="#how-it-works" className="footer-link">How it works</a>
          <a href="#faq" className="footer-link">FAQ</a>
        </div>
        <div className="footer-col">
          <p className="footer-col-title">Contact</p>
          <a href="mailto:hello.visaineed@gmail.com" className="footer-link">hello.visaineed@gmail.com</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} VisaIneed. Visa rules change frequently — always verify with official government sources before travelling.</p>
      </div>
    </footer>
  );
}
