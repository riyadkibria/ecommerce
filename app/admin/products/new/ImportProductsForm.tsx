
"use client";

import { useActionState } from "react";
import {
  importFakeProducts,
  type ImportProductsState,
} from "./actions";

const initialState: ImportProductsState = {};

export default function ImportProductsForm() {
  const [state, formAction, isPending] = useActionState(
    importFakeProducts,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h2 className="font-semibold text-slate-900">
          Fake Store API
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Import demonstration products into your Supabase
          products table. Products already imported from this
          API will be skipped.
        </p>

        <p className="mt-2 break-all text-xs text-slate-500">
          https://fakestoreapi.com/products
        </p>
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      {state.message && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Importing products..."
          : "Import Fake API Products"}
      </button>
    </form>
  );
}
