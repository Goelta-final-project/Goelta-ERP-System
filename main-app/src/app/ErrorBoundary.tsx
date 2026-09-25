import { Component, type ErrorInfo, type ReactNode } from "react";

/** Last-resort UI boundary; it never clears or rewrites persisted records. */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Workspace rendering failed", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="workspace-recovery" role="alert">
          <h1>We couldn’t open this page.</h1>
          <p>
            Reload the workspace to try again. Your saved browser data has not
            been cleared.
          </p>
          <a className="btn primary" href="/">
            Reload workspace
          </a>
        </main>
      );
    }
    return this.props.children;
  }
}
