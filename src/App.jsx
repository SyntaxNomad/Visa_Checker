import { useState } from "react";
import Header from "./components/Header";
import CheckerForm from "./components/CheckerForm";
import LoadingState from "./components/LoadingState";
import ResultCards from "./components/ResultCards";
import ErrorBanner from "./components/ErrorBanner";
import HowItWorks from "./components/HowItWorks";
import TrustSection from "./components/TrustSection";
import FAQSection from "./components/FAQSection";
import Footer from "./components/Footer";
import { callGemini } from "./api/gemini";
import { useRecentRoutes } from "./hooks/useRecentRoutes";

export default function App() {
  const [step, setStep] = useState("form");
  const [selection, setSelection] = useState({ passport: "", residence: "", destination: "" });
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const { recentRoutes, addRoute } = useRecentRoutes();

  async function handleCheck(passport, residence, destination, residenceStatus = "") {
    setSelection({ passport, residence, destination, residenceStatus });
    setStep("loading");
    setError("");
    window.scrollTo({ top: 0 });
    try {
      const text = await callGemini(passport, residence, destination, residenceStatus);
      addRoute(passport, residence, destination);
      setResult(text);
      setStep("results");
    } catch (err) {
      setError(err.message);
      setStep("error");
    }
  }

  function handleReset() {
    setStep("form");
    setResult("");
    setError("");
    setSelection({ passport: "", residence: "", destination: "" });
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="app">
      <Header showNav={step === "form"} onHome={handleReset} />
      <main className="main">
        {step === "form" && (
          <>
            <section className="hero" id="check">
              <div className="hero-inner">
                <div className="hero-copy">
                  <p className="hero-badge">
                    <span className="hero-badge-dot" /> Verified daily against official sources
                  </p>
                  <h1 className="hero-title">
                    Know if you need a visa — <span className="hero-title-accent">in seconds</span>
                  </h1>
                  <p className="hero-sub">
                    Instant, verified visa requirements for any passport and destination.
                    Factor in where you live, see exactly what documents you need, and get
                    alerted when the rules change.
                  </p>
                  <ul className="hero-points">
                    <li>190+ passports, every destination</li>
                    <li>Residence-permit aware results</li>
                    <li>Change alerts with zero false alarms</li>
                  </ul>
                </div>
                <div className="hero-form">
                  <CheckerForm onCheck={handleCheck} recentRoutes={recentRoutes} />
                </div>
              </div>
            </section>
            <HowItWorks />
            <TrustSection />
            <FAQSection />
          </>
        )}
        {step === "loading" && <div className="flow-wrap"><LoadingState selection={selection} /></div>}
        {step === "results" && (
          <div className="flow-wrap">
            <ResultCards result={result} selection={selection} onReset={handleReset} />
          </div>
        )}
        {step === "error" && <div className="flow-wrap"><ErrorBanner message={error} onReset={handleReset} /></div>}
      </main>
      <Footer />
    </div>
  );
}
