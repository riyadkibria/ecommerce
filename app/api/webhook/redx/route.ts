
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const webhookSecret = process.env.REDX_WEBHOOK_SECRET!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function POST(request: NextRequest) {
  try {
    if (!webhookSecret || !serviceRoleKey || !supabaseUrl) {
      console.error("REDX webhook environment variables are missing");

      return NextResponse.json(
        { error: "Webhook is not configured" },
        { status: 500 }
      );
    }

    // Prefer a secret header. Query parameter is a fallback
    // only if REDX cannot send custom headers.
    const headerSecret = request.headers.get(
      "x-redx-webhook-secret"
    );

    const querySecret = request.nextUrl.searchParams.get("secret");

    if (
      headerSecret !== webhookSecret &&
      querySecret !== webhookSecret
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const trackingNumber =
      body.tracking_number ??
      body.data?.tracking_number;

    const status =
      body.status ??
      body.data?.status;

    if (
      typeof trackingNumber !== "string" ||
      !trackingNumber.trim() ||
      typeof status !== "string" ||
      !status.trim()
    ) {
      return NextResponse.json(
        { error: "Invalid tracking number or status" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("shipments")
      .update({
        status: status.trim(),
      })
      .eq("tracking_number", trackingNumber.trim())
      .select("id, tracking_number, status");

    if (error) {
      console.error("REDX shipment update failed:", error.message);

      return NextResponse.json(
        { error: "Could not update shipment" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: data.length,
    });
  } catch (error) {
    console.error("REDX webhook error:", error);

    return NextResponse.json(
      { error: "Invalid webhook request" },
      { status: 400 }
    );
  }
}
