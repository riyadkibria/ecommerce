
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

type VerificationResponse = {
  mer_txnid?: string;
  merchant_id?: string;
  store_id?: string;
  amount?: string | number;
  amount_bdt?: string | number;
  currency?: string;
  currency_merchant?: string;
  pay_status?: string;
  status_code?: string | number;
};

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

function amountsMatch(
  verifiedAmount: string | number | undefined,
  orderTotal: string | number | null
) {
  const verified = Number(verifiedAmount);
  const expected = Number(orderTotal);

  return (
    Number.isFinite(verified) &&
    Number.isFinite(expected) &&
    verified >= 0 &&
    expected >= 0 &&
    Math.round(verified * 100) === Math.round(expected * 100)
  );
}

function findAreaName(value: unknown, areaId: number): string | null {
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

function getTrackingNumber(data: any): string | null {
  const value =
    data?.tracking_id ??
    data?.data?.tracking_id ??
    data?.parcel?.tracking_id ??
    data?.data?.parcel?.tracking_id;

  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  return String(value).trim();
}

function paymentRedirect(request: Request, orderId: string | number) {
  return redirectTo(
    request,
    `/order-success/${encodeURIComponent(String(orderId))}?payment=success`
  );
}

function shippingPendingRedirect(
  request: Request,
  orderId: string | number
) {
  return redirectTo(
    request,
    `/order-success/${encodeURIComponent(String(orderId))}?payment=paid-shipping-pending`
  );
}

export async function POST(request: Request) {
  try {
    // 1. Read the transaction ID sent by aamarPay.
    const formData = await request.formData();

    const transactionId = String(
      formData.get("mer_txnid") || formData.get("tran_id") || ""
    ).trim();

    if (!transactionId || transactionId.length > 32) {
      return redirectTo(request, "/checkout?payment=invalid-transaction");
    }

    // 2. Load server-only configuration.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const paymentBaseUrl = process.env.AMARPAY_BASE_URL;
    const storeId = process.env.AMARPAY_STORE_ID;
    const signatureKey = process.env.AMARPAY_SIGNATURE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !paymentBaseUrl ||
      !storeId ||
      !signatureKey
    ) {
      console.error("[PAYMENT] Configuration is incomplete.");

      return redirectTo(request, "/checkout?payment=configuration-error");
    }

    const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 3. Find the order belonging to this transaction.
    // IMPORTANT: user_id is required to clear the logged-in user's cart.
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        "id, user_id, total, subtotal, payment_method, payment_status, aamarpay_tran_id, full_name, phone, city, address_line, courier_slug, redx_area_id"
      )
      .eq("aamarpay_tran_id", transactionId)
      .maybeSingle();

    if (orderError || !order) {
      console.error("[PAYMENT] Order lookup failed:", orderError?.message);

      return redirectTo(request, "/checkout?payment=order-not-found");
    }

    if (
      order.payment_method !== "aamarpay" ||
      order.aamarpay_tran_id !== transactionId
    ) {
      return redirectTo(request, "/checkout?payment=invalid-order");
    }

    // 4. Verify payment unless it has already been verified.
    if (order.payment_status !== "paid") {
      if (order.payment_status !== "pending") {
        return redirectTo(request, "/checkout?payment=invalid-status");
      }

      let baseUrl: URL;

      try {
        baseUrl = new URL(paymentBaseUrl);
      } catch {
        return redirectTo(request, "/checkout?payment=configuration-error");
      }

      const allowedHosts = [
        "sandbox.aamarpay.com",
        "secure.aamarpay.com",
      ];

      if (
        baseUrl.protocol !== "https:" ||
        !allowedHosts.includes(baseUrl.hostname.toLowerCase())
      ) {
        console.error("[PAYMENT] Invalid aamarPay base URL.");

        return redirectTo(request, "/checkout?payment=configuration-error");
      }

      const verificationUrl = new URL(
        "/api/v1/trxcheck/request.php",
        baseUrl.origin
      );

      verificationUrl.searchParams.set("request_id", transactionId);
      verificationUrl.searchParams.set("store_id", storeId);
      verificationUrl.searchParams.set("signature_key", signatureKey);
      verificationUrl.searchParams.set("type", "json");

      const verificationResponse = await fetch(
        verificationUrl.toString(),
        {
          method: "GET",
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!verificationResponse.ok) {
        console.error(
          "[PAYMENT] Verification HTTP error:",
          verificationResponse.status
        );

        return redirectTo(request, "/checkout?payment=verification-error");
      }

      const verification =
        (await verificationResponse.json()) as VerificationResponse;

      const verifiedTransactionId = String(
        verification.mer_txnid ?? ""
      ).trim();

      const verifiedStoreId = String(
        verification.store_id ?? verification.merchant_id ?? ""
      ).trim();

      const successful =
        String(verification.status_code) === "2" &&
        String(verification.pay_status ?? "").toLowerCase() ===
          "successful";

      const correctTransaction =
        verifiedTransactionId === transactionId;

      const correctStore = verifiedStoreId === storeId;

      const verifiedAmount =
        verification.amount_bdt ?? verification.amount;

      const correctAmount = amountsMatch(
        verifiedAmount,
        order.total
      );

      const correctCurrency =
        String(
          verification.currency_merchant ??
            verification.currency ??
            ""
        ).toUpperCase() === "BDT";

      if (
        !successful ||
        !correctTransaction ||
        !correctStore ||
        !correctAmount ||
        !correctCurrency
      ) {
        console.error("[PAYMENT] Verification did not pass.", {
          orderId: order.id,
          successful,
          correctTransaction,
          correctStore,
          correctAmount,
          correctCurrency,
        });

        return redirectTo(request, "/checkout?payment=not-verified");
      }

      // 5. Mark payment as paid only after successful verification.
      const { data: updatedOrder, error: updateError } = await admin
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", order.id)
        .eq("payment_status", "pending")
        .eq("aamarpay_tran_id", transactionId)
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error(
          "[PAYMENT] Status update failed:",
          updateError.message
        );

        return redirectTo(request, "/checkout?payment=update-error");
      }

      if (!updatedOrder) {
        // Another callback may have updated the order concurrently.
        const { data: latestOrder, error: latestError } = await admin
          .from("orders")
          .select("payment_status")
          .eq("id", order.id)
          .maybeSingle();

        if (latestError || latestOrder?.payment_status !== "paid") {
          return redirectTo(request, "/checkout?payment=update-error");
        }
      }

      console.log("[PAYMENT] Payment verified:", order.id);
    } else {
      console.log(
        "[PAYMENT] Order already paid; continuing idempotent cleanup:",
        order.id
      );
    }

    // 6. Clear the logged-in user's cart AFTER payment is confirmed.
    //
    // This also runs if the order was already paid before this callback.
    // NOTE: This deletes the user's ENTIRE cart. See the note below.
    if (order.user_id) {
      const { error: cartDeleteError } = await admin
        .from("cart_items")
        .delete()
        .eq("user_id", order.user_id);

      if (cartDeleteError) {
        console.error(
          "[CART] Failed to clear cart after verified payment:",
          {
            orderId: order.id,
            userId: order.user_id,
            error: cartDeleteError.message,
          }
        );

        // Payment remains paid. Do not revert the payment status.
        return shippingPendingRedirect(request, order.id);
      }

      console.log(
        "[CART] Cart cleared after verified payment:",
        order.id
      );
    } else {
      console.warn(
        "[CART] Order has no user_id; no logged-in cart was cleared:",
        order.id
      );
    }

    // 7. No automatic REDX shipment for other couriers.
    if (order.courier_slug !== "redx") {
      return paymentRedirect(request, order.id);
    }

    // 8. Validate REDX configuration.
    const redxBaseUrl = (
      process.env.REDX_BASE_URL ??
      process.env.REDX_API_URL ??
      ""
    ).replace(/\/+$/, "");

    const redxToken = process.env.REDX_ACCESS_TOKEN ?? "";
    const pickupStoreId = Number(process.env.REDX_PICKUP_STORE_ID);
    const areaId = Number(order.redx_area_id);

    if (
      !redxBaseUrl ||
      !redxToken ||
      !Number.isInteger(pickupStoreId) ||
      pickupStoreId <= 0 ||
      !Number.isInteger(areaId) ||
      areaId <= 0
    ) {
      console.error("[REDX] Configuration or delivery area is missing.");

      return shippingPendingRedirect(request, order.id);
    }

    // 9. Check for an existing shipment BEFORE calling REDX.
    const { data: existingShipment, error: shipmentLookupError } =
      await admin
        .from("shipments")
        .select("id, tracking_number, status")
        .eq("order_id", order.id)
        .maybeSingle();

    if (shipmentLookupError) {
      console.error(
        "[SHIPMENT] Lookup failed:",
        shipmentLookupError.message
      );

      return shippingPendingRedirect(request, order.id);
    }

    if (existingShipment) {
      if (existingShipment.tracking_number) {
        // Already created: do not create another REDX parcel.
        return paymentRedirect(request, order.id);
      }

      // A previous request may have reached REDX even if its response was lost.
      // Do not automatically retry an ambiguous shipment.
      console.warn("[SHIPMENT] Existing shipment needs review:", {
        orderId: order.id,
        status: existingShipment.status,
      });

      return shippingPendingRedirect(request, order.id);
    }

    // 10. Get the REDX courier database ID.
    const { data: courier, error: courierError } = await admin
      .from("couriers")
      .select("id")
      .eq("slug", "redx")
      .maybeSingle();

    if (courierError || !courier) {
      console.error("[SHIPMENT] REDX courier record not found.");

      return shippingPendingRedirect(request, order.id);
    }

    // 11. Get the official REDX delivery area name.
    let areaName: string | null = null;

    try {
      const areasResponse = await fetch(`${redxBaseUrl}/areas`, {
        method: "GET",
        headers: {
          "API-ACCESS-TOKEN": `Bearer ${redxToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });

      const areasText = await areasResponse.text();

      let areasData: unknown;

      try {
        areasData = JSON.parse(areasText);
      } catch {
        areasData = null;
      }

      if (!areasResponse.ok || !areasData) {
        console.error(
          "[REDX] Area request failed:",
          areasResponse.status
        );

        return shippingPendingRedirect(request, order.id);
      }

      areaName = findAreaName(areasData, areaId);
    } catch (error) {
      console.error(
        "[REDX] Area request error:",
        error instanceof Error ? error.message : "Unknown error"
      );

      return shippingPendingRedirect(request, order.id);
    }

    if (!areaName) {
      console.error("[REDX] Selected delivery area was not found.");

      return shippingPendingRedirect(request, order.id);
    }

    // 12. Reserve the shipment row BEFORE calling REDX.
    // A unique index on shipments.order_id helps prevent duplicate rows.
    const { data: shipment, error: shipmentInsertError } = await admin
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
      console.error(
        "[SHIPMENT] Could not reserve shipment:",
        shipmentInsertError?.message
      );

      return shippingPendingRedirect(request, order.id);
    }

    // 13. Create the REDX parcel.
    // Online payment is already collected, so cash collection is zero.
    const parcelPayload = {
      customer_name: String(order.full_name),
      customer_phone: String(order.phone),
      delivery_area: areaName,
      delivery_area_id: areaId,
      customer_address: String(order.address_line),
      merchant_invoice_id: String(order.id),
      cash_collection_amount: 0,
      parcel_weight: 500,
      value: Number(order.subtotal),
      pickup_store_id: pickupStoreId,
      is_closed_box: true,
    };

    let parcelData: any;

    try {
      const parcelResponse = await fetch(`${redxBaseUrl}/parcel`, {
        method: "POST",
        headers: {
          "API-ACCESS-TOKEN": `Bearer ${redxToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(parcelPayload),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });

      const parcelText = await parcelResponse.text();

      try {
        parcelData = JSON.parse(parcelText);
      } catch {
        parcelData = { raw: parcelText };
      }

      if (!parcelResponse.ok) {
        console.error("[REDX] Parcel request failed:", {
          status: parcelResponse.status,
          response: parcelData,
        });

        await admin
          .from("shipments")
          .update({ status: "failed" })
          .eq("id", shipment.id);

        return shippingPendingRedirect(request, order.id);
      }
    } catch (error) {
      console.error(
        "[REDX] Parcel request error:",
        error instanceof Error ? error.message : "Unknown error"
      );

      // The request may have reached REDX before timing out.
      // Do not automatically send another parcel request.
      await admin
        .from("shipments")
        .update({ status: "failed" })
        .eq("id", shipment.id);

      return shippingPendingRedirect(request, order.id);
    }

    // 14. Extract and save the tracking number.
    const trackingNumber = getTrackingNumber(parcelData);

    if (!trackingNumber) {
      console.error("[REDX] Tracking number missing:", parcelData);

      await admin
        .from("shipments")
        .update({ status: "failed" })
        .eq("id", shipment.id);

      return shippingPendingRedirect(request, order.id);
    }

    const { error: trackingSaveError } = await admin
      .from("shipments")
      .update({
        tracking_number: trackingNumber,
        status: "created",
      })
      .eq("id", shipment.id);

    if (trackingSaveError) {
      console.error(
        "[SHIPMENT] Tracking number save failed:",
        trackingSaveError.message
      );

      // REDX may already have created the parcel.
      // Never create another parcel automatically in this situation.
      return shippingPendingRedirect(request, order.id);
    }

    console.log("[SHIPMENT] REDX parcel created:", {
      orderId: order.id,
      trackingNumber,
    });

    return paymentRedirect(request, order.id);
  } catch (error) {
    console.error(
      "[PAYMENT] Success callback error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return redirectTo(request, "/checkout?payment=verification-error");
  }
}