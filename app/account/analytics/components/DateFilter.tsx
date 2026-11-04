
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Props = {
  selectedDate: string;
  today: string;
};

export default function DateFilter({
  selectedDate,
  today,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDateChange(date: string) {
    if (!date || date > today) return;

    startTransition(() => {
      if (date === today) {
        router.push("/account/analytics");
      } else {
        router.push(
          `/account/analytics?date=${encodeURIComponent(date)}`
        );
      }
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
            🗓️
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Filter by date
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Select a date to automatically load its orders.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label
            htmlFor="analytics-date"
            className="sr-only"
          >
            Select order date
          </label>

          <input
            id="analytics-date"
            type="date"
            value={selectedDate}
            max={today}
            disabled={isPending}
            onChange={(event) =>
              handleDateChange(event.target.value)
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 sm:w-auto"
          />

          <button
            type="button"
            onClick={() => handleDateChange(today)}
            disabled={isPending || selectedDate === today}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Today
          </button>
        </div>
      </div>

      {isPending && (
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs font-medium text-blue-600">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          Loading selected date...
        </div>
      )}
    </section>
  );
}
