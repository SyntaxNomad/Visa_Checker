export default function ErrorBanner({ message, onReset }) {
  return (
    <div className="error-container">
      <div className="error-card">
        <div className="error-icon">!</div>
        <h2 className="error-title">Something went wrong</h2>
        <p className="error-message">{message}</p>
        <button className="btn-primary" onClick={onReset}>
          Try Again
        </button>
      </div>
    </div>
  );
}
