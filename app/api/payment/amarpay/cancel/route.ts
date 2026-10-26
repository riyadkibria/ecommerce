
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Gateway callback এসেছে কি না এবং payload-এর format বুঝতে
  // আপাতত শুধু callback receive করছি।
  const contentType = request.headers.get("content-type") ?? "";

  let callbackData: Record<string, unknown> = {};

  try {
    if (contentType.includes("application/json")) {
      callbackData = await request.json();
    } else {
      const formData = await request.formData();
      callbackData = Object.fromEntries(formData.entries());
    }
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid callback payload." },
      { status: 400 }
    );
  }

  console.log("aamarPay callback received:", {
    endpoint: new URL(request.url).pathname,
    tran_id: callbackData.tran_id ?? callbackData.mer_txnid,
    status_code: callbackData.status_code,
    pay_status: callbackData.pay_status,
  });

  // IMPORTANT:
  // Callback পেলেই payment verified বা order paid হবে না।
  // পরের ধাপে transaction verification যুক্ত করব।

  return NextResponse.redirect(
    new URL("/checkout?payment=callback-received", request.url),
    303
  );
}
