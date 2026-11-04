
import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TrackingEvent = {
  status: string;
  messageBn: string | null;
  time: string;
};

function getErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;
  const message = obj.message ?? obj.error ?? obj.detail;

  return typeof message === "string" ? message : null;
}

function getObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getString(
  obj: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = obj[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return null;
}

function extractHistory(data: unknown): TrackingEvent[] {
  const root = getObject(data);

  if (!root) return [];

  const nestedData = getObject(root.data);
  const trackingObject =
    getObject(root.tracking) ??
    getObject(nestedData?.tracking);

  const possibleArrays = [
    root.tracking,
    root.data,
    root.history,
    root.events,
    nestedData?.tracking,
    nestedData?.history,
    nestedData?.events,
    trackingObject?.history,
    trackingObject?.events,
  ];

  const events = possibleArrays.find(Array.isArray);

  if (!Array.isArray(events)) return [];

  return events
    .map((item): TrackingEvent | null => {
      const event = getObject(item);

      if (!event) return null;

      const status =
        getString(event, [
          "status",
          "status_name",
          "message_en",
          "message",
          "name",
        ]) ?? "Shipment update";

      const messageBn = getString(event, [
        "message_bn",
        "status_bn",
        "description_bn",
      ]);

      const time = getString(event, [
        "time",
        "created_at",
        "updated_at",
        "timestamp",
        "date",
      ]);

      if (!time) return null;

      return { status, messageBn, time };
    })
    .filter((event): event is TrackingEvent => event !== null)
    .sort(
      (a, b) =>
        new Date(b.time).getTime() - new Date(a.time).getTime()
    );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // 1. Validate the order ID.
    const { orderId } = await params;

    if (!/^[1-9]\d*$/.test(orderId)) {
      return NextResponse.json(
        { error: "Invalid order ID." },
        { status: 400 }
      );
    }

    // 2. Authenticate the current user.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to track this order." },
        { status: 401 }
      );
    }

    // 3. Confirm this order belongs to the signed-in user.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, courier_slug")
      .eq("id", Number(orderId))
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderError) {
      console.error("[REDX TRACK] Order query failed:", orderError);

      return NextResponse.json(
        { error: "Could not verify this order." },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    if (order.courier_slug !== "redx") {
      return NextResponse.json(
        { error: "Tracking is only configured for REDX orders." },
        { status: 400 }
      );
    }

    // 4. Create the server-side Supabase admin client.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[REDX TRACK] Missing Supabase server environment variables.");

      return NextResponse.json(
        { error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    const admin = createSupabaseAdmin(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // 5. Find the shipment tracking number for this order.
    const { data: shipment, error: shipmentError } = await admin
      .from("shipments")
      .select("tracking_number, status")
      .eq("order_id", order.id)
      .limit(1)
      .maybeSingle();

    if (shipmentError) {
      console.error("[REDX TRACK] Shipment query failed:", shipmentError);

      return NextResponse.json(
        { error: "Could not load shipment information." },
        { status: 500 }
      );
    }

    if (!shipment?.tracking_number) {
      return NextResponse.json(
        { error: "No tracking number is available for this order yet." },
        { status: 404 }
      );
    }

    // 6. Read REDX configuration. Never expose the token to the browser.
    const baseUrl = (
      process.env.REDX_API_URL ??
      process.env.REDX_BASE_URL ??
      ""
    ).replace(/\/+$/, "");

    const token = process.env.REDX_ACCESS_TOKEN;

    if (!baseUrl || !token) {
      console.error("[REDX TRACK] REDX_API_URL/REDX_BASE_URL or REDX_ACCESS_TOKEN is missing.");

      return NextResponse.json(
        { error: "REDX server configuration is incomplete." },
        { status: 500 }
      );
    }

    // 7. Request the latest tracking information from REDX.
    const trackingUrl =
      `${baseUrl}/parcel/track/` +
      encodeURIComponent(shipment.tracking_number);

    let redxResponse: Response;

    try {
      redxResponse = await fetch(trackingUrl, {
        method: "GET",
        headers: {
          "API-ACCESS-TOKEN": `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      console.error(
        "[REDX TRACK] REDX request failed:",
        error instanceof Error ? error.message : error
      );

      return NextResponse.json(
        { error: "Could not connect to REDX. Please try again." },
        { status: 502 }
      );
    }

    const responseText = await redxResponse.text();

    let redxData: unknown;

    try {
      redxData = responseText ? JSON.parse(responseText) : {};
    } catch {
      redxData = { message: responseText.slice(0, 500) };
    }

    if (!redxResponse.ok) {
      // Log the response for server-side debugging, but do not log credentials.
      console.error("[REDX TRACK] REDX API error:", {
        httpStatus: redxResponse.status,
        response: redxData,
      });

      return NextResponse.json(
        {
          error:
            getErrorMessage(redxData) ??
            `REDX tracking request failed (${redxResponse.status}).`,
        },
        { status: 502 }
      );
    }

    // 8. Extract tracking events from common response shapes.
    const history = extractHistory(redxData);
    const root = getObject(redxData);
    const nestedData = getObject(root?.data);
    const trackingObject =
      getObject(root?.tracking) ??
      getObject(nestedData?.tracking);

    const latest = history[0];

    const currentStatus =
      getString(trackingObject ?? {}, [
        "current_status",
        "status",
        "status_name",
      ]) ??
      getString(nestedData ?? {}, [
        "current_status",
        "status",
        "status_name",
      ]) ??
      getString(root ?? {}, [
        "current_status",
        "status",
        "status_name",
      ]) ??
      latest?.status ??
      shipment.status ??
      "Status unavailable";

    const messageBn =
      latest?.messageBn ??
      getString(trackingObject ?? {}, [
        "message_bn",
        "status_bn",
        "description_bn",
      ]) ??
      getString(nestedData ?? {}, [
        "message_bn",
        "status_bn",
        "description_bn",
      ]) ??
      getString(root ?? {}, [
        "message_bn",
        "status_bn",
        "description_bn",
      ]);

    const lastUpdated =
      latest?.time ??
      getString(trackingObject ?? {}, [
        "updated_at",
        "last_updated",
        "created_at",
      ]) ??
      getString(nestedData ?? {}, [
        "updated_at",
        "last_updated",
        "created_at",
      ]) ??
      getString(root ?? {}, [
        "updated_at",
        "last_updated",
        "created_at",
      ]);

    // 9. Save the latest status locally when it is meaningful.
    if (currentStatus !== "Status unavailable") {
      const { error: updateError } = await admin
        .from("shipments")
        .update({ status: currentStatus })
        .eq("order_id", order.id)
        .eq("tracking_number", shipment.tracking_number);

      if (updateError) {
        // Tracking can still be shown even if the local status update fails.
        console.error(
          "[REDX TRACK] Could not save shipment status:",
          updateError
        );
      }
    }

    // 10. Return only the tracking information needed by the UI.
    return NextResponse.json(
      {
        trackingNumber: shipment.tracking_number,
        status: currentStatus,
        messageBn,
        lastUpdated,
        history,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[REDX TRACK] Unexpected server error:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      { error: "An unexpected error occurred while tracking this order." },
      { status: 500 }
    );
  }
}
