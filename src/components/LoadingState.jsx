export default function LoadingState({ selection }) {
  return (
    <div className="loading-container">
      <div className="loading-card">
        <div className="spinner" aria-label="Loading" />
        <h2 className="loading-title">Checking visa requirements...</h2>
        {selection.passport && (
          <p className="loading-sub">
            {selection.passport} passport → {selection.destination}
          </p>
        )}
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
