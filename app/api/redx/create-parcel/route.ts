
import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = {
  [key: string]: unknown;
};

// REDX-এর areas response-এর মধ্যে ID দিয়ে area খোঁজা
function findAreaName(
  data: unknown,
  targetId: number
): string | null {
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findAreaName(item, targetId);
      if (result) return result;
    }
    return null;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const item = data as JsonObject;

  const id = Number(item.id ?? item.area_id);
  const name = item.name;

  if (
    id === targetId &&
    typeof name === "string" &&
    name.trim()
  ) {
    return name.trim();
  }

  for (const value of Object.values(item)) {
    const result = findAreaName(value, targetId);
    if (result) return result;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. User login করেছে কি না যাচাই
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 }
      );
    }

    // 2. শুধু order ID গ্রহণ করব
    const body = await request.json();
    const orderId = Number(body.orderId);

    if (
      !Number.isSafeInteger(orderId) ||
      orderId <= 0
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid order ID" },
        { status: 400 }
      );
    }

    // 3. Database থেকে order আনব
    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // 4. শুধু REDX courier-এর order
    if (order.courier_slug !== "redx") {
      return NextResponse.json(
        { success: false, message: "This order is not for REDX" },
        { status: 400 }
      );
    }

    // 5. COD অথবা verified paid order অনুমোদন
    const paymentMethod = String(order.payment_method).toLowerCase();
    const paymentStatus = String(order.payment_status).toLowerCase();

    const isCOD = paymentMethod === "cod";
    const isVerifiedPaid = paymentStatus === "paid";

    if (!isCOD && !isVerifiedPaid) {
      return NextResponse.json(
        {
          success: false,
          message: "Online payment must be verified first",
        },
        { status: 409 }
      );
    }

    if (isCOD && paymentStatus !== "pending" && paymentStatus !== "unpaid") {
      if (paymentStatus !== "paid") {
        return NextResponse.json(
          { success: false, message: "Invalid COD payment status" },
          { status: 409 }
        );
      }
    }

    // 6. আগেই tracking number তৈরি হয়েছে কি না
    const { data: previousShipment, error: shipmentCheckError } =
      await supabase
        .from("shipments")
        .select("id, tracking_number, status")
        .eq("order_id", orderId)
        .maybeSingle();

    if (shipmentCheckError) {
      throw shipmentCheckError;
    }

    if (previousShipment?.tracking_number) {
      return NextResponse.json({
        success: true,
        alreadyCreated: true,
        trackingNumber: previousShipment.tracking_number,
        message: "Parcel already exists",
      });
    }

    if (previousShipment?.status === "creating") {
      return NextResponse.json(
        {
          success: false,
          message: "Parcel creation is already in progress",
        },
        { status: 409 }
      );
    }

    // 7. Order items database থেকে আনব
    const { data: items, error: itemsError } =
      await supabase
        .from("order_items")
        .select("product_title, quantity, price")
        .eq("order_id", orderId);

    if (itemsError) throw itemsError;

    if (!items?.length) {
      return NextResponse.json(
        { success: false, message: "Order has no items" },
        { status: 400 }
      );
    }

    const areaId = Number(order.redx_area_id);

    if (!Number.isInteger(areaId) || areaId <= 0) {
      return NextResponse.json(
        { success: false, message: "REDX area ID is missing" },
        { status: 400 }
      );
    }

    // 8. Server environment যাচাই
    const baseUrl = process.env.REDX_API_URL?.replace(/\/+$/, "");
    const token = process.env.REDX_ACCESS_TOKEN;
    const pickupStoreId = Number(process.env.REDX_PICKUP_STORE_ID);

    if (
      !baseUrl ||
      !token ||
      !Number.isInteger(pickupStoreId) ||
      pickupStoreId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "REDX server configuration is incomplete",
        },
        { status: 500 }
      );
    }

    // 9. REDX API থেকে area name বের করব
    const areasResponse = await fetch(`${baseUrl}/areas`, {
      headers: {
        "API-ACCESS-TOKEN": `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const areasData: unknown = await areasResponse.json();

    if (!areasResponse.ok) {
      throw new Error("Could not retrieve REDX delivery areas");
    }

    const deliveryArea = findAreaName(areasData, areaId);

    if (!deliveryArea) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not match the selected REDX area",
          areaId,
        },
        { status: 400 }
      );
    }

    // 10. Parcel-এর হিসাব database থেকে
    const cashCollection = isCOD ? Number(order.total) : 0;
    const declaredValue = Number(order.subtotal);

    if (
      !Number.isFinite(cashCollection) ||
      cashCollection < 0 ||
      !Number.isFinite(declaredValue) ||
      declaredValue < 0
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid order amount" },
        { status: 400 }
      );
    }

    // 11. Duplicate request ঠেকাতে আগে shipment record
    let shipmentId: number;

    if (previousShipment) {
      const { data: updated, error } = await supabase
        .from("shipments")
        .update({ status: "creating" })
        .eq("id", previousShipment.id)
        .is("tracking_number", null)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!updated) {
        return NextResponse.json(
          { success: false, message: "Shipment is already being processed" },
          { status: 409 }
        );
      }

      shipmentId = updated.id;
    } else {
      const { data: courier, error: courierError } =
        await supabase
          .from("couriers")
          .select("id")
          .eq("slug", "redx")
          .eq("is_active", true)
          .single();

      if (courierError || !courier) {
        throw new Error("Active REDX courier not found in database");
      }

      const { data: created, error: createError } =
        await supabase
          .from("shipments")
          .insert({
            order_id: orderId,
            courier_id: courier.id,
            tracking_number: null,
            status: "creating",
          })
          .select("id")
          .single();

      if (createError || !created) {
        throw new Error(
          "Could not reserve shipment. Check for a duplicate request."
        );
      }

      shipmentId = created.id;
    }

    // 12. REDX-এ parcel পাঠাব
    const parcelPayload = {
      customer_name: order.full_name,
      customer_phone: order.phone,
      delivery_area: deliveryArea,
      delivery_area_id: areaId,
      customer_address: `${order.address_line}, ${order.city}`,
      merchant_invoice_id: `ORD-${order.id}`,
      cash_collection_amount: cashCollection,
      parcel_weight: 1,
      value: declaredValue,
      pickup_store_id: pickupStoreId,
      is_closed_box: false,
      parcel_details_json: items.map((item) => ({
        name: item.product_title,
        category: "General",
        value: Math.round(Number(item.price)),
      })),
    };

    const redxResponse = await fetch(`${baseUrl}/parcel`, {
      method: "POST",
      headers: {
        "API-ACCESS-TOKEN": `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(parcelPayload),
      cache: "no-store",
    });

    const redxData: unknown = await redxResponse.json();

    if (!redxResponse.ok) {
      await supabase
        .from("shipments")
        .update({ status: "failed" })
        .eq("id", shipmentId);

      console.error("REDX parcel creation failed", {
        status: redxResponse.status,
        response: redxData,
        orderId,
      });

      return NextResponse.json(
        {
          success: false,
          message: "REDX could not create the parcel",
        },
        { status: 502 }
      );
    }

    const result = redxData as JsonObject;
    const trackingNumber = result.tracking_id;

    if (
      typeof trackingNumber !== "string" ||
      !trackingNumber.trim()
    ) {
      await supabase
        .from("shipments")
        .update({ status: "failed" })
        .eq("id", shipmentId);

      console.error("REDX response did not contain tracking_id", {
        orderId,
        response: redxData,
      });

      return NextResponse.json(
        {
          success: false,
          message: "REDX response did not include a tracking ID",
        },
        { status: 502 }
      );
    }

    // 13. Tracking number database-এ সংরক্ষণ
    const { error: saveError } = await supabase
      .from("shipments")
      .update({
        tracking_number: trackingNumber,
        status: "pickup-pending",
      })
      .eq("id", shipmentId);

    if (saveError) {
      // REDX parcel তৈরি হয়ে গেছে, তাই tracking ID log করা জরুরি
      console.error("CRITICAL: REDX parcel created but tracking save failed", {
        orderId,
        trackingNumber,
        error: saveError,
      });

      return NextResponse.json(
        {
          success: false,
          parcelCreated: true,
          message: "Parcel created, but saving tracking number failed",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId,
      trackingNumber,
      message: "REDX parcel created successfully",
    });
  } catch (error) {
    console.error("REDX create-parcel route error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error while creating REDX parcel",
      },
      { status: 500 }
    );
  }
}
