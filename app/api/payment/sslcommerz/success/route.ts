
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

function findAreaName(
  value: unknown,
  areaId: number
): string | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findAreaName(item, areaId);
      if (result) return result;
    }

    return null;
  }

  if (typeof value !== "object") return null;

  const obj = value as JsonObject;
  const id = Number(obj.id ?? obj.area_id);

  if (id === areaId && typeof obj.name === "string") {
    return obj.name;
  }

  for (const child of Object.values(obj)) {
    const result = findAreaName(child, areaId);
    if (result) return result;
  }

  return null;
}

function getTrackingNumber(
  parcelData: JsonObject
): string | null {
  const data = parcelData.data as JsonObject | undefined;
  const parcel = parcelData.parcel as JsonObject | undefined;
  const nestedParcel = data?.parcel as JsonObject | undefined;

  const value =
    parcelData.tracking_id ??
    data?.tracking_id ??
    parcel?.tracking_id ??
    nestedParcel?.tracking_id;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function redirectToOrder(
  baseUrl: URL,
  orderId: string | number
) {
  return NextResponse.redirect(
    new URL(
      `/order-success/${encodeURIComponent(String(orderId))}`,
      baseUrl
    ),
    { status: 303 }
  );
}

export async function POST(request: Request) {
  try {
    // 1. Check server configuration.
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !storeId ||
      !storePassword ||
      !appUrl ||
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error("[SSLCOMMERZ] Server configuration missing.");

      return NextResponse.json(
        {
          success: false,
          message: "Server configuration missing.",
        },
        { status: 500 }
      );
    }

    // 2. Validate application URL.
    let baseUrl: URL;

    try {
      baseUrl = new URL(appUrl);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid application URL.",
        },
        { status: 500 }
      );
    }

    if (
      baseUrl.protocol !== "http:" &&
      baseUrl.protocol !== "https:"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid application URL.",
        },
        { status: 500 }
      );
    }

    // 3. Read the SSLCommerz callback.
    const formData = await request.formData();

    const valId = String(formData.get("val_id") ?? "");
    const transactionId = String(formData.get("tran_id") ?? "");

    if (!valId || !transactionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment information missing.",
        },
        { status: 400 }
      );
    }

    // 4. Verify payment directly with SSLCommerz.
    // This endpoint is for sandbox testing.
    const validationUrl = new URL(
      "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
    );

    validationUrl.searchParams.set("val_id", valId);
    validationUrl.searchParams.set("store_id", storeId);
    validationUrl.searchParams.set("store_passwd", storePassword);
    validationUrl.searchParams.set("format", "json");

    const validationResponse = await fetch(validationUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    if (!validationResponse.ok) {
      console.error("[SSLCOMMERZ] Validation API unavailable:", {
        status: validationResponse.status,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Payment verification unavailable.",
        },
        { status: 502 }
      );
    }

    const payment = await validationResponse.json();

    if (
      !["VALID", "VALIDATED"].includes(
        String(payment.status ?? "").toUpperCase()
      ) ||
      String(payment.tran_id ?? "") !== transactionId ||
      String(payment.currency ?? "").toUpperCase() !== "BDT"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment could not be verified.",
        },
        { status: 400 }
      );
    }

    // 5. Create Supabase admin client.
    const admin = createSupabaseClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 6. Find the order linked to this transaction.
    const {
      data: order,
      error: orderError,
    } = await admin
      .from("orders")
      .select(`
        id,
        user_id,
        full_name,
        phone,
        address_line,
        courier_slug,
        redx_area_id,
        subtotal,
        total,
        payment_status,
        payment_method
      `)
      .eq("sslcommerz_tran_id", transactionId)
      .eq("payment_method", "sslcommerz")
      .maybeSingle();

    if (orderError || !order) {
      console.error("[SSLCOMMERZ] Order lookup failed:", orderError);

      return NextResponse.json(
        {
          success: false,
          message: "Matching order not found.",
        },
        { status: 404 }
      );
    }

    // 7. Check the amount against the stored order total.
    const expectedAmount = Number(order.total);
    const paidAmount = Number(payment.amount);

    if (
      !Number.isFinite(expectedAmount) ||
      !Number.isFinite(paidAmount) ||
      Math.abs(expectedAmount - paidAmount) > 0.009
    ) {
      console.error("[SSLCOMMERZ] Amount mismatch:", {
        orderId: order.id,
        expectedAmount,
        paidAmount,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Payment amount mismatch.",
        },
        { status: 400 }
      );
    }

    // 8. Mark the order paid.
    if (order.payment_status !== "paid") {
      const {
        data: updatedOrder,
        error: updateError,
      } = await admin
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", order.id)
        .eq("sslcommerz_tran_id", transactionId)
        .eq("payment_status", "pending")
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error(
          "[SSLCOMMERZ] Payment status update failed:",
          updateError
        );

        return NextResponse.json(
          {
            success: false,
            message: "Could not update payment status.",
          },
          { status: 500 }
        );
      }

      // Handle a concurrent callback.
      if (!updatedOrder) {
        const {
          data: currentOrder,
          error: currentOrderError,
        } = await admin
          .from("orders")
          .select("payment_status")
          .eq("id", order.id)
          .eq("sslcommerz_tran_id", transactionId)
          .maybeSingle();

        if (
          currentOrderError ||
          currentOrder?.payment_status !== "paid"
        ) {
          return NextResponse.json(
            {
              success: false,
              message: "Could not confirm the payment status.",
            },
            { status: 500 }
          );
        }
      }
    }

    // 9. Clear the authenticated customer's database cart.
    // A cart-cleanup failure must not invalidate a verified payment.
    if (order.user_id) {
      const { error: cartError } = await admin
        .from("cart_items")
        .delete()
        .eq("user_id", order.user_id);

      if (cartError) {
        console.error("[SSLCOMMERZ] Cart cleanup failed:", {
          orderId: order.id,
          error: cartError,
        });
      }
    }

    // 10. Orders using another courier do not need REDX automation.
    if (order.courier_slug !== "redx") {
      return redirectToOrder(baseUrl, order.id);
    }

    // 11. Check if a shipment record already exists.
    // Do not automatically create another parcel for an existing record.
    const {
      data: existingShipment,
      error: existingShipmentError,
    } = await admin
      .from("shipments")
      .select("id, tracking_number, status")
      .eq("order_id", order.id)
      .limit(1)
      .maybeSingle();

    if (existingShipmentError) {
      console.error("[REDX] Shipment lookup failed:", {
        orderId: order.id,
        error: existingShipmentError,
      });

      return redirectToOrder(baseUrl, order.id);
    }

    if (existingShipment) {
      console.info("[REDX] Existing shipment found; skipping parcel creation.", {
        orderId: order.id,
        trackingNumber: existingShipment.tracking_number,
        status: existingShipment.status,
      });

      return redirectToOrder(baseUrl, order.id);
    }

    // 12. Check REDX environment variables.
    const redxBaseUrl = (
      process.env.REDX_BASE_URL ??
      process.env.REDX_API_URL ??
      ""
    ).replace(/\/+$/, "");

    const redxToken = process.env.REDX_ACCESS_TOKEN ?? "";
    const pickupStoreId = Number(
      process.env.REDX_PICKUP_STORE_ID
    );
    const redxAreaId = Number(order.redx_area_id);

    if (
      !redxBaseUrl ||
      !redxToken ||
      !Number.isInteger(pickupStoreId) ||
      pickupStoreId <= 0 ||
      !Number.isInteger(redxAreaId) ||
      redxAreaId <= 0
    ) {
      console.error("[REDX] Configuration or area missing:", {
        orderId: order.id,
      });

      return redirectToOrder(baseUrl, order.id);
    }

    // 13. Look up the REDX delivery area name.
    let deliveryAreaName = "";

    try {
      const areasResponse = await fetch(
        `${redxBaseUrl}/areas`,
        {
          method: "GET",
          headers: {
            "API-ACCESS-TOKEN": `Bearer ${redxToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!areasResponse.ok) {
        console.error("[REDX] Area API failed:", {
          orderId: order.id,
          status: areasResponse.status,
        });

        return redirectToOrder(baseUrl, order.id);
      }

      const areasData: unknown = await areasResponse.json();

      deliveryAreaName =
        findAreaName(areasData, redxAreaId) ?? "";

      if (!deliveryAreaName) {
        console.error("[REDX] Area not found:", {
          orderId: order.id,
          redxAreaId,
        });

        return redirectToOrder(baseUrl, order.id);
      }
    } catch (error) {
      console.error("[REDX] Area request failed:", {
        orderId: order.id,
        error,
      });

      return redirectToOrder(baseUrl, order.id);
    }

    // 14. Find the REDX courier ID in Supabase.
    const {
      data: courier,
      error: courierError,
    } = await admin
      .from("couriers")
      .select("id")
      .eq("slug", "redx")
      .maybeSingle();

    if (courierError || !courier) {
      console.error("[REDX] Courier lookup failed:", courierError);

      return redirectToOrder(baseUrl, order.id);
    }

    // 15. Load the saved order items.
    const {
      data: orderItems,
      error: orderItemsError,
    } = await admin
      .from("order_items")
      .select("product_title, quantity")
      .eq("order_id", order.id);

    if (
      orderItemsError ||
      !orderItems ||
      orderItems.length === 0
    ) {
      console.error("[REDX] Order items lookup failed:", {
        orderId: order.id,
        error: orderItemsError,
      });

      return redirectToOrder(baseUrl, order.id);
    }

    // 16. Insert the shipment record before making the REDX request.
    const {
      data: shipment,
      error: shipmentInsertError,
    } = await admin
      .from("shipments")
      .insert({
        order_id: order.id,
        courier_id: courier.id,
        tracking_number: null,
        status: "creating",
      })
      .select("id")
      .single();

    if (shipmentInsertError || !shipment) {
      console.error("[REDX] Shipment insert failed:", {
        orderId: order.id,
        error: shipmentInsertError,
      });

      return redirectToOrder(baseUrl, order.id);
    }

    // 17. Create the REDX parcel.
    // Online payment is already collected, so COD collection is zero.
    const parcelPayload = {
      customer_name: order.full_name,
      customer_phone: order.phone,
      delivery_area: deliveryAreaName,
      delivery_area_id: redxAreaId,
      customer_address: order.address_line,
      merchant_invoice_id: String(order.id),
      cash_collection_amount: 0,
      parcel_weight: 500,
      value: Number(order.subtotal),
      pickup_store_id: pickupStoreId,
      is_closed_box: true,
      parcel_details_json: JSON.stringify(
        orderItems.map((item: JsonObject) => ({
          name: item.product_title ?? "Product",
          quantity: Number(item.quantity) || 0,
        }))
      ),
    };

    let parcelData: JsonObject;

    try {
      const parcelResponse = await fetch(
        `${redxBaseUrl}/parcel`,
        {
          method: "POST",
          headers: {
            "API-ACCESS-TOKEN": `Bearer ${redxToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(parcelPayload),
          cache: "no-store",
          signal: AbortSignal.timeout(20000),
        }
      );

      const responseText = await parcelResponse.text();

      try {
        parcelData = JSON.parse(responseText) as JsonObject;
      } catch {
        parcelData = { raw: responseText };
      }

      if (!parcelResponse.ok) {
        console.error("[REDX] Parcel API failed:", {
          orderId: order.id,
          status: parcelResponse.status,
          response: parcelData,
        });

        await admin
          .from("shipments")
          .update({ status: "failed" })
          .eq("id", shipment.id);

        return redirectToOrder(baseUrl, order.id);
      }
    } catch (error) {
      // A timeout may occur even when REDX has created the parcel.
      // Keep "creating" so a repeated callback cannot create a duplicate.
      console.error("[REDX] Parcel request outcome uncertain:", {
        orderId: order.id,
        error,
      });

      return redirectToOrder(baseUrl, order.id);
    }

    // 18. Extract the tracking number.
    const trackingNumber = getTrackingNumber(parcelData);

    if (!trackingNumber) {
      console.error("[REDX] Tracking number missing:", {
        orderId: order.id,
        response: parcelData,
      });

      await admin
        .from("shipments")
        .update({ status: "failed" })
        .eq("id", shipment.id);

      return redirectToOrder(baseUrl, order.id);
    }

    // 19. Save the tracking number.
    const {
      error: shipmentUpdateError,
    } = await admin
      .from("shipments")
      .update({
        tracking_number: trackingNumber,
        status: "created",
      })
      .eq("id", shipment.id);

    if (shipmentUpdateError) {
      console.error("[REDX] Tracking save failed:", {
        orderId: order.id,
        trackingNumber,
        error: shipmentUpdateError,
      });
    }

    // 20. Redirect to the order confirmation page.
    return redirectToOrder(baseUrl, order.id);
  } catch (error) {
    console.error("[SSLCOMMERZ] Success callback error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Payment verification failed.",
      },
      { status: 500 }
    );
  }
}
