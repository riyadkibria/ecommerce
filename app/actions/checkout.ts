
"use server";

import { createClient } from "@/app/lib/supabase/server";

type CourierSlug = "redx" | "steadfast";

type CreateCodOrderInput = {
  fullName: string;
  phone: string;
  city: string;
  address: string;
  courierSlug: CourierSlug;
  areaId: string;
};

type CreateCodOrderResult =
  | { success: true; orderId: string }
  | { success: false; message: string };

export async function createCodOrder(
  input: CreateCodOrderInput
): Promise<CreateCodOrderResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "অর্ডার করতে প্রথমে লগইন করো।",
    };
  }

  const fullName = input.fullName.trim();
  const phone = input.phone.trim();
  const city = input.city.trim();
  const address = input.address.trim();

  if (!fullName || !phone || !city || !address) {
    return {
      success: false,
      message: "নাম, ফোন, শহর ও সম্পূর্ণ ঠিকানা পূরণ করো।",
    };
  }

  if (
    input.courierSlug !== "redx" &&
    input.courierSlug !== "steadfast"
  ) {
    return {
      success: false,
      message: "সঠিক courier নির্বাচন করো।",
    };
  }

  let redxAreaId: number | null = null;

  if (input.courierSlug === "redx") {
    if (!/^\d+$/.test(input.areaId)) {
      return {
        success: false,
        message: "REDX delivery area নির্বাচন করো।",
      };
    }

    redxAreaId = Number(input.areaId);

    if (!Number.isSafeInteger(redxAreaId) || redxAreaId <= 0) {
      return {
        success: false,
        message: "REDX delivery area সঠিক নয়।",
      };
    }
  }

  const { data, error } = await supabase.rpc("place_cod_order", {
    p_full_name: fullName,
    p_phone: phone,
    p_city: city,
    p_address_line: address,
    p_courier_slug: input.courierSlug,
    p_redx_area_id: redxAreaId,
  });

  if (error) {
    console.error("COD order RPC failed:", error.message);

    return {
      success: false,
      message:
        error.message.includes("empty")
          ? "তোমার cart খালি। আগে পণ্য যোগ করো।"
          : error.message.includes("Insufficient stock")
            ? "একটি পণ্যের পর্যাপ্ত stock নেই। Cart আপডেট করো।"
            : "অর্ডার তৈরি করা যায়নি। তথ্য যাচাই করে আবার চেষ্টা করো।",
    };
  }

  const result = data as {
    success?: boolean;
    order_id?: number | string;
  };

  if (!result?.success || result.order_id == null) {
    return {
      success: false,
      message: "অর্ডার তৈরি নিশ্চিত করা যায়নি।",
    };
  }

  return {
    success: true,
    orderId: String(result.order_id),
  };
}
