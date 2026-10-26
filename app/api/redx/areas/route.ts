
import { NextRequest, NextResponse } from "next/server";
import { redxFetch } from "@/app/lib/redx/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RedxArea = {
  id: number;
  name: string;
  post_code: number;
  district_name: string;
  division_name: string;
  zone_id: number;
};

export async function GET(request: NextRequest) {
  try {
    const districtName =
      request.nextUrl.searchParams.get("district_name")?.trim();

    const endpoint = districtName
      ? `/areas?district_name=${encodeURIComponent(districtName)}`
      : "/areas";

    const result = await redxFetch<unknown>(endpoint);

    // REDX response থেকে area array বের করা
    const areas = extractAreas(result);

    // Optional district filter
    const filteredAreas = districtName
      ? areas.filter(
          (area) =>
            area.district_name.trim().toLowerCase() ===
            districtName.toLowerCase()
        )
      : areas;

    return NextResponse.json({
      success: true,
      data: {
        areas: filteredAreas,
      },
    });
  } catch (error) {
    console.error(
      "REDX areas error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      {
        success: false,
        message: "Could not fetch REDX delivery areas.",
      },
      { status: 502 }
    );
  }
}

function extractAreas(result: unknown): RedxArea[] {
  if (Array.isArray(result)) {
    return result as RedxArea[];
  }

  if (!result || typeof result !== "object") {
    return [];
  }

  const data = result as Record<string, unknown>;

  // Supported response formats:
  // { areas: [...] }
  // { data: [...] }
  // { data: { areas: [...] } }
  if (Array.isArray(data.areas)) {
    return data.areas as RedxArea[];
  }

  if (Array.isArray(data.data)) {
    return data.data as RedxArea[];
  }

  if (data.data && typeof data.data === "object") {
    const nested = data.data as Record<string, unknown>;

    if (Array.isArray(nested.areas)) {
      return nested.areas as RedxArea[];
    }
  }

  return [];
}