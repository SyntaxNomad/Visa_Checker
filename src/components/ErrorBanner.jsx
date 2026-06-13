import Icon from "./Icon";

export default function ErrorBanner({ message, onReset }) {
  return (
    <div className="error-container">
      <div className="error-card">
        <div className="error-icon"><Icon name="alert" size={24} /></div>
        <h2 className="error-title">That didn't go through</h2>
        <p className="error-message">{message}</p>
        <button className="btn-primary" onClick={onReset}>
          Try again
        </button>
      </div>
    </div>
  );
}
