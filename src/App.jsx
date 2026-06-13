import { useState } from "react";
import Header from "./components/Header";
import CheckerForm from "./components/CheckerForm";
import LoadingState from "./components/LoadingState";
import ResultCards from "./components/ResultCards";
import ErrorBanner from "./components/ErrorBanner";
import Explorer from "./components/Explorer";
import Compare from "./components/Compare";
import Trip from "./components/Trip";
import Intel from "./components/Intel";
import HistoryView from "./components/HistoryView";
import HowItWorks from "./components/HowItWorks";
import TrustSection from "./components/TrustSection";
import FAQSection from "./components/FAQSection";
import Footer from "./components/Footer";
import Globe from "./components/Globe";
import { CountUp } from "./components/motion";
import { callGemini } from "./api/gemini";
import { lookupPassportIndex } from "./lib/dataset";
import { useHistory } from "./hooks/useHistory";
import { parseResult, getStatusConfig } from "./lib/status";

export default function App() {
  const [view, setView] = useState("home"); // home | explore | compare | intel | history
  const [step, setStep] = useState("form"); // form | loading | results | error (within home)
  const [selection, setSelection] = useState({ passport: "", residence: "", destination: "" });
  const [result, setResult] = useState("");
  const [meta, setMeta] = useState(null); // { ts, fromCache }
  const [error, setError] = useState("");
  const [explorerPassport, setExplorerPassport] = useState("");
  const [prefillDestination, setPrefillDestination] = useState("");
  const { history, addCheck, removeCheck, togglePin } = useHistory();

  async function handleCheck(passport, residence, destination, residenceStatus = "") {
    setSelection({ passport, residence, destination, residenceStatus });
    setView("home");
    setStep("loading");
    setError("");
    window.scrollTo({ top: 0 });
    try {
      const [text, verified] = await Promise.all([
        callGemini(passport, residence, destination, residenceStatus),
        lookupPassportIndex(passport, destination),
      ]);
      const status = getStatusConfig(parseResult(text)["VISA STATUS"]).label;
      addCheck({ passport, residence, destination, residenceStatus, result: text, status, verified });
      setResult(text);
      setMeta({ ts: Date.now(), fromCache: false, verified });
      setStep("results");
    } catch (err) {
      setError(err.message);
      setStep("error");
    }
  }

  function openSaved(entry) {
    setSelection({
      passport: entry.passport,
      residence: entry.residence,
      destination: entry.destination,
      residenceStatus: entry.residenceStatus,
    });
    setResult(entry.result);
    setMeta({ ts: entry.ts, fromCache: true, verified: entry.verified });
    setView("home");
    setStep("results");
    window.scrollTo({ top: 0 });
  }

  function handleReset() {
    setStep("form");
    setResult("");
    setError("");
    setMeta(null);
    setSelection({ passport: "", residence: "", destination: "" });
    window.scrollTo({ top: 0 });
  }

  function handleNavigate(target) {
    if (target === "check") {
      setView("home");
      setStep("form");
      requestAnimationFrame(() =>
        document.getElementById("check")?.scrollIntoView({ behavior: "smooth" })
      );
      return;
    }
    setView(target);
    if (target === "home") setStep("form");
    window.scrollTo({ top: 0 });
  }

  function openExplorerFor(passport) {
    setExplorerPassport(passport);
    handleNavigate("explore");
  }

  function prefillChecker(destination) {
    setPrefillDestination(destination);
    handleNavigate("check");
  }

  const recentRoutes = history.slice(0, 4);

  return (
    <div className="app">
      <Header view={view} onNavigate={handleNavigate} historyCount={history.length} />
      <main className="main">
        {view === "explore" && (
          <div className="flow-wrap">
            <Explorer
              passport={explorerPassport}
              onChangePassport={setExplorerPassport}
              onCheck={handleCheck}
            />
          </div>
        )}

        {view === "compare" && (
          <div className="flow-wrap">
            <Compare onCheck={handleCheck} />
          </div>
        )}

        {view === "trip" && (
          <div className="flow-wrap">
            <Trip onCheck={handleCheck} />
          </div>
        )}

        {view === "intel" && (
          <div className="flow-wrap">
            <Intel onExplorePassport={openExplorerFor} onCheckDestination={prefillChecker} />
          </div>
        )}

        {view === "history" && (
          <div className="flow-wrap">
            <HistoryView
              history={history}
              onOpen={openSaved}
              onRecheck={(h) => handleCheck(h.passport, h.residence, h.destination, h.residenceStatus)}
              onRemove={removeCheck}
              onTogglePin={togglePin}
              onNew={() => handleNavigate("check")}
            />
          </div>
        )}

        {view === "home" && step === "form" && (
          <>
            <section className="hero" id="check">
              <div className="hero-bg" aria-hidden="true">
                <Globe />
              </div>
              <div className="hero-inner">
                <div className="hero-copy">
                  <p className="hero-eyebrow">VISAINEED · GLOBAL ENTRY INTELLIGENCE</p>
                  <h1 className="hero-title">
                    Every border,<br /><span className="hero-title-accent">decoded.</span>
                  </h1>
                  <p className="hero-sub">
                    Passport intelligence for every border on earth — instant verified answers,
                    residence-aware results, and alerts that only fire when the rules truly change.
                  </p>
                  <div className="hero-stats">
                    <div className="hero-stat">
                      <span className="hero-stat-num"><CountUp value={195} /></span>
                      <span className="hero-stat-label">destinations</span>
                    </div>
                    <div className="hero-stat">
                      <span className="hero-stat-num"><CountUp value={38000} format={(n) => `${Math.round(n / 1000)}k`} />+</span>
                      <span className="hero-stat-label">corridors verified</span>
                    </div>
                    <div className="hero-stat">
                      <span className="hero-stat-num">24<span className="hero-stat-unit">h</span></span>
                      <span className="hero-stat-label">re-check cycle</span>
                    </div>
                  </div>
                  <button className="hero-explore" onClick={() => handleNavigate("explore")}>
                    Or explore everywhere your passport can go →
                  </button>
                </div>
                <div className="hero-form">
                  <CheckerForm
                    key={prefillDestination || "blank"}
                    initialDestination={prefillDestination}
                    onCheck={handleCheck}
                    recentRoutes={recentRoutes}
                  />
                </div>
              </div>
              <div className="mrz" aria-hidden="true">
                P&lt;VSNVISAINEED&lt;&lt;GLOBAL&lt;ENTRY&lt;INTELLIGENCE&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />
                1950VISA&lt;7NEED&lt;&lt;2026&lt;&lt;&lt;195DEST&lt;&lt;38KCORRIDORS&lt;&lt;&lt;&lt;&lt;&lt;&lt;00
              </div>
            </section>
            <HowItWorks />
            <TrustSection />
            <FAQSection />
          </>
        )}

        {view === "home" && step === "loading" && (
          <div className="flow-wrap"><LoadingState selection={selection} /></div>
        )}

        {view === "home" && step === "results" && (
          <div className="flow-wrap">
            <ResultCards
              result={result}
              selection={selection}
              onReset={handleReset}
              meta={meta}
              onRecheck={() => handleCheck(selection.passport, selection.residence, selection.destination, selection.residenceStatus)}
            />
          </div>
        )}

        {view === "home" && step === "error" && (
          <div className="flow-wrap"><ErrorBanner message={error} onReset={handleReset} /></div>
        )}
      </main>
      <Footer />
    </div>
  );
}
