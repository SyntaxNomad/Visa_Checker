import { useState } from "react";
import Header from "./components/Header";
import CheckerForm from "./components/CheckerForm";
import LoadingState from "./components/LoadingState";
import ResultCards from "./components/ResultCards";
import ErrorBanner from "./components/ErrorBanner";
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
  }

  return (
    <div className="app">
      <Header />
      <main className="main">
        {step === "form" && (
          <CheckerForm onCheck={handleCheck} recentRoutes={recentRoutes} />
        )}
        {step === "loading" && <LoadingState selection={selection} />}
        {step === "results" && (
          <ResultCards result={result} selection={selection} onReset={handleReset} />
        )}
        {step === "error" && <ErrorBanner message={error} onReset={handleReset} />}
      </main>
    </div>
  );
}
