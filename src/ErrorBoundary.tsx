import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-dvh w-screen items-center justify-center bg-zinc-100 p-4">
          <div className="max-w-md rounded-3xl border border-zinc-200 bg-white px-8 py-10 text-center">
            <h1 className="text-zinc-900 text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-zinc-500 text-sm">
              An unexpected error occurred. Please reload the page to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
