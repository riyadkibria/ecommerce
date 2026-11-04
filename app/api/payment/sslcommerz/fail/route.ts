
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const transactionId = String(formData.get("tran_id") ?? "");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      return NextResponse.json(
        { success: false, message: "App URL is not configured." },
        { status: 500 }
      );
    }

    console.warn("SSLCommerz payment failed:", {
      transactionId: transactionId || "not provided",
    });

    const redirectUrl = new URL("/payment-failed", appUrl);
    redirectUrl.searchParams.set("gateway", "sslcommerz");

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("SSLCommerz fail callback error:", error);

    return NextResponse.json(
      { success: false, message: "Could not process failed payment." },
      { status: 500 }
    );
  }
}
