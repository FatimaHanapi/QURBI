import React from "react";
import { CircleAlert } from "lucide-react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("QURBI page error", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="page-error-title"
          className="w-full max-w-sm rounded-3xl border border-[#E3C19F]/60 bg-gradient-to-br from-[#41362D] to-[#6B594A] p-5 text-center shadow-2xl"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E3C19F] bg-white/10">
            <CircleAlert className="h-7 w-7 text-[#E3C19F]" />
          </div>
          <h2 id="page-error-title" className="mt-4 text-xl font-bold text-white">
            This page could not open
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#F7EDE2]">
            Your payment has not been charged again. If an order was created, you can safely continue from My Orders.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => window.location.assign("/orders")}
              className="min-h-12 rounded-xl border border-[#E3C19F] text-sm font-bold text-white"
            >
              My Orders
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-12 rounded-xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] text-sm font-bold text-[#41362D]"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
