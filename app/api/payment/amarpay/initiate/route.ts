
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const baseUrl = process.env.AMARPAY_BASE_URL;
  const storeId = process.env.AMARPAY_STORE_ID;
  const signatureKey = process.env.AMARPAY_SIGNATURE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!baseUrl || !storeId || !signatureKey || !appUrl) {
    return NextResponse.json(
      { success: false, message: "aamarPay environment variables are missing." },
      { status: 500 }
    );
  }

  const tranId = `TEST-${Date.now()}`;

  const payload = {
    store_id: storeId,
    signature_key: signatureKey,
    tran_id: tranId,
    amount: "10.00",
    currency: "BDT",
    desc: "Sandbox integration test",
    cus_name: "Sandbox Customer",
    cus_email: "customer@example.com",
    cus_phone: "01700000000",
    cus_add1: "Dhaka",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    success_url: `${appUrl}/api/payment/amarpay/success`,
    fail_url: `${appUrl}/api/payment/amarpay/fail`,
    cancel_url: `${appUrl}/api/payment/amarpay/cancel`,
    type: "json",
  };

  try {
    const response = await fetch(`${baseUrl}/jsonpost.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const result = await response.json();

    if (
      !response.ok ||
      String(result.result).toLowerCase() !== "true" ||
      typeof result.payment_url !== "string"
    ) {
      console.error("aamarPay initiation failed:", result);

      return NextResponse.json(
        { success: false, message: "aamarPay could not create the test payment." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentUrl: result.payment_url,
      tranId,
    });
  } catch (error) {
    console.error("aamarPay request error:", error);

    return NextResponse.json(
      { success: false, message: "Could not connect to aamarPay." },
      { status: 502 }
    );
  }
}
