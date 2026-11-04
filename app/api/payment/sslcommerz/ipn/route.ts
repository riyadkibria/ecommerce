
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!storeId || !storePassword || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, message: "Server configuration missing." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const valId = String(formData.get("val_id") ?? "");
    const transactionId = String(formData.get("tran_id") ?? "");

    if (!valId || !transactionId) {
      return NextResponse.json(
        { success: false, message: "Payment information missing." },
        { status: 400 }
      );
    }

    // SSLCommerz-এর server থেকে payment verify করি।
    const validationUrl = new URL(
      "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
    );

    validationUrl.searchParams.set("val_id", valId);
    validationUrl.searchParams.set("store_id", storeId);
    validationUrl.searchParams.set("store_passwd", storePassword);
    validationUrl.searchParams.set("format", "json");

    const response = await fetch(validationUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Payment verification unavailable." },
        { status: 502 }
      );
    }

    const payment = await response.json();

    if (
      !["VALID", "VALIDATED"].includes(
        String(payment.status ?? "").toUpperCase()
      ) ||
      payment.tran_id !== transactionId ||
      String(payment.currency ?? "").toUpperCase() !== "BDT"
    ) {
      return NextResponse.json(
        { success: false, message: "Payment could not be verified." },
        { status: 400 }
      );
    }

    const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, total, payment_status")
      .eq("sslcommerz_tran_id", transactionId)
      .eq("payment_method", "sslcommerz")
      .maybeSingle();

    if (orderError || !order) {
      console.error("SSLCommerz IPN order lookup failed:", orderError);

      return NextResponse.json(
        { success: false, message: "Matching order not found." },
        { status: 404 }
      );
    }

    const expectedAmount = Number(order.total);
    const paidAmount = Number(payment.amount);

    if (
      !Number.isFinite(expectedAmount) ||
      !Number.isFinite(paidAmount) ||
      Math.abs(expectedAmount - paidAmount) > 0.009
    ) {
      console.error("SSLCommerz IPN amount mismatch:", {
        orderId: order.id,
        expectedAmount,
        paidAmount,
      });

      return NextResponse.json(
        { success: false, message: "Payment amount mismatch." },
        { status: 400 }
      );
    }

    if (order.payment_status !== "paid") {
      const { error: updateError } = await admin
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", order.id)
        .eq("sslcommerz_tran_id", transactionId)
        .eq("payment_status", "pending");

      if (updateError) {
        console.error("SSLCommerz IPN update failed:", updateError);

        return NextResponse.json(
          { success: false, message: "Could not update payment status." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, message: "Payment verified." });
  } catch (error) {
    console.error("SSLCommerz IPN error:", error);

    return NextResponse.json(
      { success: false, message: "IPN processing failed." },
      { status: 500 }
    );
  }
}
