
import { NextResponse } from "next/server";
import { redxFetch } from "@/app/lib/redx/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await redxFetch<unknown>("/pickup/stores");

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "REDX pickup stores error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      {
        success: false,
        message: "Could not fetch REDX pickup stores.",
      },
      { status: 502 }
    );
  }
}
