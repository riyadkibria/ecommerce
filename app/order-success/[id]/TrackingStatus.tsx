
"use client";

import { useState } from "react";

type TrackingEvent = {
  status: string;
  messageBn: string | null;
  time: string;
};

type TrackingResult = {
  trackingNumber: string;
  status: string;
  messageBn: string | null;
  lastUpdated: string | null;
  history: TrackingEvent[];
};

export default function TrackingStatus({
  orderId,
  trackingNumber,
  initialStatus,
}: {
  orderId: number;
  trackingNumber: string;
  initialStatus: string | null;
}) {
  const [data, setData] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadTracking() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/shipments/${orderId}/track`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not load tracking status."
        );
      }

      setData(result as TrackingResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while tracking."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("en-BD", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={loadTracking}
        disabled={loading}
        className="break-all text-left font-mono text-xs font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4 transition hover:text-emerald-900 disabled:cursor-wait disabled:opacity-60"
      >
        {trackingNumber}
        <span className="ml-2 font-sans text-[11px]">
          {loading ? "Loading..." : "Track parcel ↗"}
        </span>
      </button>

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700 ring-1 ring-inset ring-rose-200"
        >
          {error}
        </p>
      )}

      {data && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Latest REDX status
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-950">
            {data.status || initialStatus || "Status unavailable"}
          </p>

          {data.messageBn && (
            <p className="mt-1 text-sm text-slate-600">
              {data.messageBn}
            </p>
          )}

          {data.lastUpdated && (
            <p className="mt-1 text-[11px] text-slate-500">
              Updated: {formatTime(data.lastUpdated)}
            </p>
          )}

          {data.history.length > 0 && (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="mb-2 text-xs font-semibold text-slate-700">
                Tracking history
              </p>

              <ol className="space-y-3">
                {data.history.map((event, index) => (
                  <li
                    key={`${event.time}-${index}`}
                    className="relative border-l-2 border-emerald-200 pb-1 pl-3"
                  >
                    <p className="text-xs font-medium text-slate-800">
                      {event.status}
                    </p>

                    {event.messageBn && (
                      <p className="mt-0.5 text-xs text-slate-600">
                        {event.messageBn}
                      </p>
                    )}

                    <p className="mt-1 text-[10px] text-slate-500">
                      {formatTime(event.time)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <button
            type="button"
            onClick={loadTracking}
            disabled={loading}
            className="mt-3 text-xs font-medium text-slate-600 underline underline-offset-4 hover:text-slate-950 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh status"}
          </button>
        </div>
      )}
    </div>
  );
}
