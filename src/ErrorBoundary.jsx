import { Component } from "react";

// Contains render-time crashes so a single bad code path (e.g. a malformed AI report
// block, or an unexpected null in the feed) can't white-screen the whole app (CROSS-001).
// `resetKey` lets the parent clear the error on navigation; `onReset` offers a recovery action.
const btn = (primary) => ({
  padding: "12px 22px", borderRadius: 6,
  border: primary ? "none" : "1.5px solid #e0e0e0",
  background: primary ? "#0a0a0a" : "#fff", color: primary ? "#fff" : "#0a0a0a",
  fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary caught:", error, info); }
  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    const { onReset } = this.props;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", fontFamily: "var(--font), system-ui, sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
          <h1 style={{ fontFamily: "var(--font-display), system-ui", fontSize: 24, fontWeight: 800, color: "#0a0a0a", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Something went wrong</h1>
          <p style={{ fontSize: 15, color: "#666", lineHeight: 1.6, margin: "0 0 24px" }}>An unexpected error interrupted the page. Your data is safe — try again.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {onReset && <button onClick={() => { this.setState({ error: null }); onReset(); }} style={btn(false)}>Back to home</button>}
            <button onClick={() => window.location.reload()} style={btn(true)}>Reload</button>
          </div>
        </div>
      </div>
    );
  }
}
