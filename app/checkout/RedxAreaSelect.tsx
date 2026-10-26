
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type RedxArea = {
  id: number;
  name: string;
  post_code: number;
  district_name: string;
  division_name: string;
  zone_id: number;
};

type Props = {
  value: string;
  onChange: (areaId: string) => void;
  onAreaChange: (area: RedxArea | null) => void;
};

const DIVISIONS = [
  "Barishal",
  "Chattogram",
  "Dhaka",
  "Khulna",
  "Mymensingh",
  "Rajshahi",
  "Rangpur",
  "Sylhet",
];

const normalize = (value: string) => value.trim().toLowerCase();

function isValidArea(value: unknown): value is RedxArea {
  if (!value || typeof value !== "object") return false;

  const area = value as Record<string, unknown>;

  return (
    Number.isSafeInteger(area.id) &&
    Number(area.id) > 0 &&
    typeof area.name === "string" &&
    area.name.trim().length > 0 &&
    Number.isFinite(Number(area.post_code)) &&
    Number(area.post_code) > 0 &&
    typeof area.district_name === "string" &&
    area.district_name.trim().length > 0 &&
    typeof area.division_name === "string" &&
    area.division_name.trim().length > 0 &&
    Number.isSafeInteger(area.zone_id) &&
    Number(area.zone_id) >= 0
  );
}

export default function RedxAreaSelect({
  value,
  onChange,
  onAreaChange,
}: Props) {
  const [areas, setAreas] = useState<RedxArea[]>([]);
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const loadAreas = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/redx/areas", {
        cache: "no-store",
        signal,
      });

      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error("Could not load REDX areas.");
      }

      if (
        !result ||
        typeof result !== "object" ||
        !("success" in result) ||
        result.success !== true ||
        !("data" in result) ||
        !result.data ||
        typeof result.data !== "object" ||
        !("areas" in result.data) ||
        !Array.isArray(result.data.areas)
      ) {
        throw new Error("Invalid REDX area response.");
      }

      const loadedAreas = result.data.areas.filter(isValidArea);

      if (loadedAreas.length === 0) {
        throw new Error("কোনো valid REDX delivery area পাওয়া যায়নি।");
      }

      setAreas(loadedAreas);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setAreas([]);
      setError(
        err instanceof Error
          ? err.message
          : "REDX area list load করা যায়নি।"
      );
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void loadAreas(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadAreas, retryCount]);

  const availableDivisions = useMemo(() => {
    const apiNames = new Set(
      areas.map((area) => normalize(area.division_name))
    );

    return DIVISIONS.filter((name) =>
      apiNames.has(normalize(name))
    );
  }, [areas]);

  const districts = useMemo(() => {
    return [
      ...new Set(
        areas
          .filter(
            (area) =>
              normalize(area.division_name) === normalize(division)
          )
          .map((area) => area.district_name.trim())
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [areas, division]);

  const filteredAreas = useMemo(() => {
    return areas
      .filter(
        (area) =>
          normalize(area.division_name) === normalize(division) &&
          normalize(area.district_name) === normalize(district)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [areas, division, district]);

  const selectedArea = useMemo(
    () =>
      filteredAreas.find((area) => String(area.id) === value) ?? null,
    [filteredAreas, value]
  );

  // Parent-এ stable callback ব্যবহার করলে অপ্রয়োজনীয় effect চলবে না।
  useEffect(() => {
    onAreaChange(selectedArea);
  }, [selectedArea, onAreaChange]);

  function handleDivisionChange(nextDivision: string) {
    setDivision(nextDivision);
    setDistrict("");
    onChange("");
    onAreaChange(null);
  }

  function handleDistrictChange(nextDistrict: string) {
    setDistrict(nextDistrict);
    onChange("");
    onAreaChange(null);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            disabled={loading}
            className="mt-2 text-sm font-semibold text-red-700 underline disabled:opacity-50"
          >
            {loading ? "Retrying..." : "Retry loading areas"}
          </button>
        </div>
      )}

      <div>
        <label
          htmlFor="redx-division"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Division *
        </label>

        <select
          id="redx-division"
          value={division}
          onChange={(event) => handleDivisionChange(event.target.value)}
          required
          disabled={loading || availableDivisions.length === 0}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 disabled:bg-slate-100"
        >
          <option value="">Select division</option>

          {availableDivisions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {loading && (
          <p className="mt-1 text-xs text-slate-500">
            Loading delivery locations...
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="redx-district"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          District *
        </label>

        <select
          id="redx-district"
          value={district}
          onChange={(event) => handleDistrictChange(event.target.value)}
          disabled={!division || loading || districts.length === 0}
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 disabled:bg-slate-100"
        >
          <option value="">Select district</option>

          {districts.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="redx-area"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          REDX Delivery Area *
        </label>

        <select
          id="redx-area"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={
            !district || loading || filteredAreas.length === 0
          }
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 disabled:bg-slate-100"
        >
          <option value="">Select delivery area</option>

          {filteredAreas.map((area) => (
            <option key={area.id} value={String(area.id)}>
              {area.name} — Postcode: {area.post_code}
            </option>
          ))}
        </select>
      </div>

      {selectedArea && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-slate-700">
          <h3 className="mb-2 font-semibold text-slate-900">
            Selected delivery location
          </h3>

          <p>Division: {selectedArea.division_name}</p>
          <p>District: {selectedArea.district_name}</p>
          <p>Area: {selectedArea.name}</p>

          <p className="mt-1 font-semibold text-indigo-700">
            Postcode: {selectedArea.post_code}
          </p>
        </div>
      )}
    </div>
  );
}
