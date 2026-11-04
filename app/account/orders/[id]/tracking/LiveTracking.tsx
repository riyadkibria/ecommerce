
"use client";

import { useCallback, useEffect, useState } from "react";

type TrackingEvent = {
  message_en?: string;
  message_bn?: string;
  time?: string;
};

type TrackingResponse = {
  trackingId?: string;
  tracking?: TrackingEvent[];
  error?: string;
};

export default function LiveTracking({
  orderId,
}: {
  orderId: string;
}) {
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTracking = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/tracking`,
        { cache: "no-store" }
      );

      const result = (await response.json()) as TrackingResponse;

      if (!response.ok) {
        throw new Error(result.error || "Could not load tracking.");
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "REDX tracking is temporarily unavailable."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadTracking();
  }, [loadTracking]);

  return (
    <div className="mt-6 space-y-5">
      {loading ? (
        <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
          Fetching the latest tracking information from REDX...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-800">{error}</p>
          <button
            type="button"
            onClick={() => void loadTracking()}
            className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-rose-800 ring-1 ring-rose-200 hover:bg-rose-100"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Tracking ID</p>
            <p className="mt-1 break-all font-semibold">
              {data?.trackingId ?? "Not available"}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Tracking history</h2>
              <button
                type="button"
                onClick={() => void loadTracking()}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Refresh
              </button>
            </div>

            {data?.tracking && data.tracking.length > 0 ? (
              <ol className="mt-4 space-y-4">
                {data.tracking.map((event, index) => (
                  <li
                    key={`${event.time ?? "event"}-${index}`}
                    className="relative border-l-2 border-blue-200 pb-3 pl-5"
                  >
                    <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-blue-600" />

                    <p className="font-medium">
                      {event.message_en ||
                        event.message_bn ||
                        "Shipment update"}
                    </p>

                    {event.message_en && event.message_bn && (
                      <p className="mt-1 text-sm text-slate-600">
                        {event.message_bn}
                      </p>
                    )}

                    {event.time && (
                      <p className="mt-1 text-xs text-slate-500">
                        {event.time}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                REDX returned no tracking events for this shipment.
              </p>
            )}
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Tracking information is requested from REDX when this page loads.
            Use Refresh to request the latest available updates.
          </p>
        </>
      )}
    </div>
  );
}
