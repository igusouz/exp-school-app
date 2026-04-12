"use client";

import { useState } from "react";

export function DailyDispatchButton() {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function runDispatch() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/notifications/dispatch", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Dispatch failed");
      }
      setMessage(`Sent: ${data.sent} | Skipped: ${data.skipped}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dispatch failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-900">
        Daily Notification Dispatch
      </h3>
      <p className="mt-1 text-sm text-cyan-800">
        Trigger the daily summary email process for all students with pending updates.
      </p>
      <button
        type="button"
        onClick={runDispatch}
        disabled={loading}
        className="mt-4 rounded-full bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send Daily Summaries"}
      </button>
      {message ? <p className="mt-3 text-sm text-cyan-900">{message}</p> : null}
    </div>
  );
}
