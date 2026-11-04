
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const transactionId = String(
      formData.get("mer_txnid") || formData.get("tran_id") || ""
    ).trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase server configuration is incomplete.");

      return NextResponse.redirect(
        new URL("/checkout?payment=configuration-error", request.url),
        303
      );
    }

    const checkoutUrl = new URL("/checkout?payment=failed", request.url);

    if (transactionId && transactionId.length <= 32) {
      const supabase = createSupabaseClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      // শুধু সংশ্লিষ্ট pending aamarPay order-এ পরিবর্তন করা হবে।
      // Callback-এর failure message-কে payment verification হিসেবে ধরা হচ্ছে না।
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "failed",
        })
        .eq("aamarpay_tran_id", transactionId)
        .eq("payment_method", "aamarpay")
        .eq("payment_status", "pending");

      if (error) {
        console.error("Could not update failed payment:", error.message);
      }
    }

    return NextResponse.redirect(checkoutUrl, 303);
  } catch (error) {
    console.error(
      "aamarPay fail callback error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.redirect(
      new URL("/checkout?payment=failed", request.url),
      303
    );
  }
}
