
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Read environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const webhookSecret = process.env.REDX_WEBHOOK_SECRET;

    // 2. Validate environment variables
    if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
      console.error("REDX webhook environment variables are missing");

      return NextResponse.json(
        { error: "Webhook is not configured" },
        { status: 500 }
      );
    }

    // 3. Initialize Supabase client inside POST
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 4. Verify REDX webhook secret
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

    // 5. Parse request body
    const body = await request.json();

    const trackingNumber =
      body.tracking_number ??
      body.data?.tracking_number;

    const status =
      body.status ??
      body.data?.status;

    // 6. Validate tracking number and status
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

    // 7. Update shipment in Supabase
    const { data, error } = await supabase
      .from("shipments")
      .update({
        status: status.trim(),
      })
      .eq("tracking_number", trackingNumber.trim())
      .select("id, tracking_number, status");

    if (error) {
      console.error(
        "REDX shipment update failed:",
        error.message
      );

      return NextResponse.json(
        { error: "Could not update shipment" },
        { status: 500 }
      );
    }

    // 8. Check whether shipment exists
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    // 9. Success response
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
