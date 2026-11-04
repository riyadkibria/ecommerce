
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

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

function isAllowedSslCommerzUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      (
        url.hostname === "sandbox.sslcommerz.com" ||
        url.hostname === "securepay.sslcommerz.com"
      )
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let orderId: string | number | null = null;

  try {
    // 1. Supabase configuration

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[ORDERS] Supabase configuration missing");

      return errorResponse(
        "Supabase server configuration ঠিক নেই।",
        500
      );
    }

    // 2. Read and validate checkout request

    let body: JsonObject;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON request.");
    }

    const fullName = String(
      body.fullName ?? body.name ?? ""
    ).trim();

    const phone = String(body.phone ?? "").trim();

    const city =
      String(body.city ?? "Dhaka").trim() || "Dhaka";

    const addressLine = String(
      body.addressLine ?? body.address ?? ""
    ).trim();

    const courierSlug = String(
      body.courierSlug ?? body.courier ?? ""
    )
      .trim()
      .toLowerCase();

    const paymentMethod = String(
      body.paymentMethod ?? "cod"
    )
      .trim()
      .toLowerCase();

    const redxAreaId = Number(
      body.areaId ?? body.redxAreaId
    );

    const items = body.items;

    if (!fullName || !phone || !addressLine) {
      return errorResponse(
        "নাম, ফোন নম্বর এবং ঠিকানা পূরণ করো।"
      );
    }

    if (!["redx", "steadfast"].includes(courierSlug)) {
      return errorResponse("সঠিক courier নির্বাচন করো।");
    }

    if (
      !["cod", "aamarpay", "sslcommerz"].includes(
        paymentMethod
      )
    ) {
      return errorResponse(
        "সঠিক payment method নির্বাচন করো।"
      );
    }

    if (
      courierSlug === "redx" &&
      (
        !Number.isInteger(redxAreaId) ||
        redxAreaId <= 0
      )
    ) {
      return errorResponse(
        "REDX delivery area নির্বাচন করো।"
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(
        "তোমার cart-এ কোনো product নেই।"
      );
    }

    if (items.length > 100) {
      return errorResponse("Cart-এ অনেক বেশি item রয়েছে।");
    }

    // 3. REDX configuration

    let baseUrl = "";
    let token = "";
    let pickupStoreId = 0;
    let deliveryAreaName = "";

    // REDX parcel automation currently applies to COD only.
    if (courierSlug === "redx" && paymentMethod === "cod") {
      baseUrl = (
        process.env.REDX_BASE_URL ??
        process.env.REDX_API_URL ??
        ""
      ).replace(/\/+$/, "");

      token = process.env.REDX_ACCESS_TOKEN ?? "";

      pickupStoreId = Number(
        process.env.REDX_PICKUP_STORE_ID
      );

      if (
        !baseUrl ||
        !token ||
        !Number.isInteger(pickupStoreId) ||
        pickupStoreId <= 0
      ) {
        console.error("[REDX] Configuration missing");

        return errorResponse(
          "REDX configuration ঠিক নেই।",
          500
        );
      }
    }

    // 4. Supabase admin client

    const admin = createSupabaseClient<any>(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 5. Identify authenticated customer

    let userId: string | null = null;
    let customerEmail = "customer@example.com";

    try {
      const supabase = await createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!userError && user) {
        userId = user.id;

        if (user.email) {
          customerEmail = user.email;
        }
      }
    } catch (error) {
      console.warn(
        "[ORDERS] Could not read user session:",
        getErrorMessage(error)
      );
    }

    // 6. Validate quantities and combine duplicate products

    const requestedItems = items.map((item: unknown) => {
      if (!item || typeof item !== "object") {
        return { productId: "", quantity: NaN };
      }

      const obj = item as JsonObject;

      return {
        productId: String(
          obj.productId ?? obj.product_id ?? ""
        ).trim(),
        quantity: Number(obj.quantity),
      };
    });

    for (const item of requestedItems) {
      if (
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        return errorResponse(
          "Cart-এর product বা quantity সঠিক নয়।"
        );
      }
    }

    const quantityMap = new Map<string, number>();

    for (const item of requestedItems) {
      const nextQuantity =
        (quantityMap.get(item.productId) ?? 0) +
        item.quantity;

      if (nextQuantity > 99) {
        return errorResponse(
          "একটি product-এর সর্বোচ্চ quantity 99।"
        );
      }

      quantityMap.set(item.productId, nextQuantity);
    }

    const productIds = Array.from(quantityMap.keys());

    // 7. Fetch real prices and check stock

    const {
      data: products,
      error: productsError,
    } = await admin
      .from("products")
      .select("*")
      .in("id", productIds);

    if (productsError) {
      console.error(
        "[ORDERS] Product query failed:",
        productsError
      );

      return errorResponse(
        "Product তথ্য যাচাই করা যায়নি।",
        500
      );
    }

    if (
      !products ||
      products.length !== productIds.length
    ) {
      return errorResponse(
        "Cart-এর কোনো product আর available নেই।"
      );
    }

    let subtotal = 0;

    const orderItems: {
      product_id: string | number;
      product_title: string;
      quantity: number;
      price: number;
    }[] = [];

    for (const product of products) {
      const quantity =
        quantityMap.get(String(product.id)) ?? 0;

      const price = Number(product.price);

      if (!Number.isFinite(price) || price < 0) {
        return errorResponse(
          "একটি product-এর price সঠিক নয়।",
          500
        );
      }

      if (
        product.stock != null &&
        (
          !Number.isFinite(Number(product.stock)) ||
          Number(product.stock) < quantity
        )
      ) {
        return errorResponse(
          `${product.title ?? "একটি product"}-এর পর্যাপ্ত stock নেই।`
        );
      }

      subtotal += price * quantity;

      orderItems.push({
        product_id: product.id,
        product_title: String(
          product.title ?? "Product"
        ),
        quantity,
        price,
      });
    }

    subtotal = Number(subtotal.toFixed(2));

    // 8. Get courier and calculate total

    const {
      data: courier,
      error: courierError,
    } = await admin
      .from("couriers")
      .select("*")
      .eq("slug", courierSlug)
      .maybeSingle();

    if (courierError) {
      console.error(
        "[ORDERS] Courier query failed:",
        courierError
      );

      return errorResponse(
        "Courier তথ্য যাচাই করা যায়নি।",
        500
      );
    }

    if (!courier || courier.is_active === false) {
      return errorResponse(
        "নির্বাচিত courier বর্তমানে available নয়।"
      );
    }

    const shippingCost = Number(courier.cost ?? 0);
    const tax = 0;

    if (
      !Number.isFinite(shippingCost) ||
      shippingCost < 0
    ) {
      return errorResponse(
        "Courier delivery charge সঠিক নয়。",
        500
      );
    }

    const total = Number(
      (subtotal + shippingCost + tax).toFixed(2)
    );

    if (!Number.isFinite(total) || total <= 0) {
      return errorResponse(
        "Order total সঠিক নয়।"
      );
    }

    // 9. Verify REDX delivery area for COD

    if (courierSlug === "redx" && paymentMethod === "cod") {
      try {
        const areasResponse = await fetch(
          `${baseUrl}/areas`,
          {
            method: "GET",
            headers: {
              "API-ACCESS-TOKEN": `Bearer ${token}`,
              Accept: "application/json",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
          }
        );

        const areasText = await areasResponse.text();

        let areasData: unknown;

        try {
          areasData = JSON.parse(areasText);
        } catch {
          areasData = areasText;
        }

        if (!areasResponse.ok) {
          console.error("[REDX] Areas API failed:", {
            status: areasResponse.status,
          });

          return errorResponse(
            "REDX area যাচাই করা যায়নি।",
            502
          );
        }

        deliveryAreaName =
          findAreaName(areasData, redxAreaId) ?? "";

        if (!deliveryAreaName) {
          return errorResponse(
            "নির্বাচিত REDX area API-তে পাওয়া যায়নি।"
          );
        }
      } catch (error) {
        console.error(
          "[REDX] Areas request failed:",
          getErrorMessage(error)
        );

        return errorResponse(
          "REDX API-এর সঙ্গে সংযোগ করা যায়নি।",
          502
        );
      }
    }

    // 10. Create order

    const {
      data: order,
      error: orderError,
    } = await admin
      .from("orders")
      .insert({
        user_id: userId,
        full_name: fullName,
        phone,
        city,
        address_line: addressLine,
        courier_slug: courierSlug,

        redx_area_id:
          courierSlug === "redx" ? redxAreaId : null,

        subtotal,
        shipping_cost: shippingCost,
        tax,
        total,

        payment_method: paymentMethod,
        payment_status: "pending",
        status: "pending",
      })
      .select("id, total, subtotal")
      .single();

    if (orderError || !order) {
      console.error(
        "[ORDERS] Order insert failed:",
        orderError
      );

      return errorResponse(
        "Order তৈরি করা যায়নি। Database error পরীক্ষা করো।",
        500
      );
    }

    orderId = order.id;

    // 11. Save order items

    const itemsToInsert = orderItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_title: item.product_title,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: orderItemsError } = await admin
      .from("order_items")
      .insert(itemsToInsert);

    if (orderItemsError) {
      console.error(
        "[ORDERS] Order items insert failed:",
        orderItemsError
      );

      await admin
        .from("orders")
        .update({ status: "failed" })
        .eq("id", order.id);

      return NextResponse.json(
        {
          success: false,
          message:
            "Order তৈরি হয়েছে, কিন্তু order items সংরক্ষণ করা যায়নি।",
          orderId: order.id,
        },
        { status: 500 }
      );
    }

    // 12. aamarPay initiation (existing integration)

    if (paymentMethod === "aamarpay") {
      const basePaymentUrl =
        process.env.AMARPAY_BASE_URL?.replace(/\/+$/, "");

      const storeId = process.env.AMARPAY_STORE_ID;
      const signatureKey =
        process.env.AMARPAY_SIGNATURE_KEY;

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");

      if (
        !basePaymentUrl ||
        !storeId ||
        !signatureKey ||
        !appUrl
      ) {
        console.error(
          "[AMARPAY] Environment configuration missing"
        );

        return errorResponse(
          "aamarPay configuration ঠিক নেই। Order তৈরি হয়েছে; payment শুরু হয়নি।",
          500
        );
      }

      const tranId =
        `ORD-${String(order.id)}-${Date.now().toString(36)}`;

      const paymentPayload = {
        store_id: storeId,
        signature_key: signatureKey,
        tran_id: tranId,
        amount: Number(order.total).toFixed(2),
        currency: "BDT",
        desc: `Order ${order.id}`,

        cus_name: fullName,
        cus_email: customerEmail,
        cus_phone: phone,
        cus_add1: addressLine.slice(0, 200),
        cus_city: city,
        cus_country: "Bangladesh",

        success_url:
          `${appUrl}/api/payment/amarpay/success`,
        fail_url:
          `${appUrl}/api/payment/amarpay/fail`,
        cancel_url:
          `${appUrl}/api/payment/amarpay/cancel`,

        type: "json",
      };

      const { error: saveError } = await admin
        .from("orders")
        .update({ aamarpay_tran_id: tranId })
        .eq("id", order.id);

      if (saveError) {
        console.error(
          "[AMARPAY] Transaction save failed:",
          saveError
        );

        return errorResponse(
          "Order তৈরি হয়েছে, কিন্তু payment transaction সংরক্ষণ করা যায়নি।",
          500
        );
      }

      try {
        const paymentResponse = await fetch(
          `${basePaymentUrl}/jsonpost.php`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(paymentPayload),
            cache: "no-store",
            signal: AbortSignal.timeout(20000),
          }
        );

        const responseText = await paymentResponse.text();

        let paymentResult: JsonObject;

        try {
          paymentResult = JSON.parse(
            responseText
          ) as JsonObject;
        } catch {
          console.error(
            "[AMARPAY] Invalid response received"
          );

          return errorResponse(
            "aamarPay-এর response বোঝা যায়নি।",
            502
          );
        }

        const paymentUrl = paymentResult.payment_url;

        let validPaymentUrl = false;

        if (typeof paymentUrl === "string") {
          try {
            const parsedUrl = new URL(paymentUrl);

            validPaymentUrl =
              parsedUrl.protocol === "https:" &&
              parsedUrl.hostname.endsWith("aamarpay.com");
          } catch {
            validPaymentUrl = false;
          }
        }

        if (
          !paymentResponse.ok ||
          String(paymentResult.result).toLowerCase() !== "true" ||
          !validPaymentUrl
        ) {
          console.error(
            "[AMARPAY] Initiation failed:",
            {
              status: paymentResponse.status,
              result: paymentResult.result,
            }
          );

          return errorResponse(
            "aamarPay payment শুরু করতে পারেনি।",
            502
          );
        }

        return NextResponse.json({
          success: true,
          paymentMethod: "aamarpay",
          orderId: order.id,
          total: order.total,
          paymentUrl,
        });
      } catch (error) {
        console.error(
          "[AMARPAY] Request failed:",
          getErrorMessage(error)
        );

        return errorResponse(
          "aamarPay-এর সঙ্গে সংযোগ করা যায়নি।",
          502
        );
      }
    }

    // 13. SSLCommerz Sandbox / Live initiation

    if (paymentMethod === "sslcommerz") {
      const storeId = process.env.SSLCOMMERZ_STORE_ID;
      const storePassword =
        process.env.SSLCOMMERZ_STORE_PASSWORD;

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");

      const sslBaseUrl = (
        process.env.SSLCOMMERZ_BASE_URL ??
        "https://sandbox.sslcommerz.com"
      ).replace(/\/+$/, "");

      if (
        !storeId ||
        !storePassword ||
        !appUrl
      ) {
        console.error(
          "[SSLCOMMERZ] Environment configuration missing"
        );

        return errorResponse(
          "SSLCommerz configuration ঠিক নেই।",
          500
        );
      }

      // Only official HTTPS sandbox/live API hosts are accepted.
      let sslHost: string;

      try {
        const base = new URL(sslBaseUrl);

        if (
          base.protocol !== "https:" ||
          ![
            "sandbox.sslcommerz.com",
            "securepay.sslcommerz.com",
          ].includes(base.hostname)
        ) {
          return errorResponse(
            "SSLCommerz API base URL সঠিক নয়।",
            500
          );
        }

        sslHost = base.origin;
      } catch {
        return errorResponse(
          "SSLCommerz API base URL সঠিক নয়।",
          500
        );
      }

      let appOrigin: string;

      try {
        const parsedAppUrl = new URL(appUrl);

        if (
          parsedAppUrl.protocol !== "https:" &&
          parsedAppUrl.hostname !== "localhost"
        ) {
          return errorResponse(
            "Application URL সঠিক নয়।",
            500
          );
        }

        appOrigin = parsedAppUrl.origin;
      } catch {
        return errorResponse(
          "Application URL সঠিক নয়।",
          500
        );
      }

      // Keep transaction IDs unique and within reasonable length.
      const tranId =
        `S${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

      // Save the transaction ID before initiating the gateway session.
      const { error: transactionSaveError } = await admin
        .from("orders")
        .update({
          sslcommerz_tran_id: tranId,
        })
        .eq("id", order.id);

      if (transactionSaveError) {
        console.error(
          "[SSLCOMMERZ] Transaction ID save failed:",
          transactionSaveError
        );

        return errorResponse(
          "Order তৈরি হয়েছে, কিন্তু SSLCommerz transaction ID সংরক্ষণ করা যায়নি।",
          500
        );
      }

      // SSLCommerz Session API expects form-encoded parameters.
      const sslPayload = new URLSearchParams({
        store_id: storeId,
        store_passwd: storePassword,

        total_amount: Number(order.total).toFixed(2),
        currency: "BDT",
        tran_id: tranId,

        success_url:
          `${appOrigin}/api/payment/sslcommerz/success`,
        fail_url:
          `${appOrigin}/api/payment/sslcommerz/fail`,
        cancel_url:
          `${appOrigin}/api/payment/sslcommerz/cancel`,

        ipn_url:
          `${appOrigin}/api/payment/sslcommerz/ipn`,

        cus_name: fullName,
        cus_email: customerEmail,
        cus_phone: phone,
        cus_add1: addressLine.slice(0, 200),
        cus_city: city,
        cus_postcode: "1000",
        cus_country: "Bangladesh",

        ship_name: fullName,
        ship_add1: addressLine.slice(0, 200),
        ship_city: city,
        ship_postcode: "1000",
        ship_country: "Bangladesh",

        shipping_method: "YES",
        product_name: `Order ${order.id}`,
        product_category: "General",
        product_profile: "general",

        value_a: String(order.id),
      });

      try {
        const sslResponse = await fetch(
          `${sslHost}/gwprocess/v4/api.php`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded",
              Accept: "application/json",
            },
            body: sslPayload.toString(),
            cache: "no-store",
            signal: AbortSignal.timeout(25000),
          }
        );

        const responseText = await sslResponse.text();

        let sslResult: JsonObject;

        try {
          sslResult = JSON.parse(
            responseText
          ) as JsonObject;
        } catch {
          console.error(
            "[SSLCOMMERZ] Invalid JSON response:",
            responseText.slice(0, 500)
          );

          return errorResponse(
            "SSLCommerz-এর response বোঝা যায়নি। Order তৈরি হয়েছে, কিন্তু payment session নিশ্চিত নয়।",
            502
          );
        }

        const gatewayPageUrl = sslResult.GatewayPageURL;

        if (
          !sslResponse.ok ||
          String(sslResult.status).toUpperCase() !== "SUCCESS" ||
          !isAllowedSslCommerzUrl(gatewayPageUrl)
        ) {
          console.error(
            "[SSLCOMMERZ] Session initiation failed:",
            {
              httpStatus: sslResponse.status,
              gatewayStatus: sslResult.status,
              failedreason: sslResult.failedreason,
            }
          );

          return errorResponse(
            "SSLCommerz payment session তৈরি করতে পারেনি।",
            502
          );
        }

        // Do not clear cart or create a courier parcel here.
        // Payment is still pending until server-side validation.
        return NextResponse.json({
          success: true,
          paymentMethod: "sslcommerz",
          orderId: order.id,
          total: order.total,
          paymentUrl: gatewayPageUrl,
        });
      } catch (error) {
        console.error(
          "[SSLCOMMERZ] Session request failed:",
          getErrorMessage(error)
        );

        return errorResponse(
          "SSLCommerz-এর সঙ্গে সংযোগ করা যায়নি। Order তৈরি হয়েছে; payment status যাচাই করতে হবে।",
          502
        );
      }
    }

    // 14. COD checkout: clear logged-in user's cart

    let cartCleared = false;

    if (userId) {
      const { error: cartDeleteError } = await admin
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (cartDeleteError) {
        console.error(
          "[ORDERS] Cart clear failed:",
          cartDeleteError
        );
      } else {
        cartCleared = true;
      }
    }

    // 15. COD + Steadfast

    if (courierSlug === "steadfast") {
      return NextResponse.json({
        success: true,
        message: "Order সফলভাবে তৈরি হয়েছে।",
        orderId: order.id,
        total: order.total,
        cartCleared,
        shipment: {
          created: false,
          message:
            "Steadfast parcel automation এখনো চালু করা হয়নি।",
        },
      });
    }

    // 16. Create REDX shipment record

    const {
      data: shipment,
      error: shipmentError,
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

    if (shipmentError || !shipment) {
      console.error(
        "[SHIPMENT] Database insert failed:",
        shipmentError
      );

      return NextResponse.json({
        success: true,
        message:
          "Order তৈরি হয়েছে, কিন্তু shipment database record তৈরি হয়নি।",
        orderId: order.id,
        total: order.total,
        cartCleared,
        shipment: {
          created: false,
          stage: "database_insert",
          errorCode: shipmentError?.code ?? null,
          error: shipmentError?.message ?? null,
        },
      });
    }

    // 17. Create REDX parcel

    const parcelPayload = {
      customer_name: fullName,
      customer_phone: phone,
      delivery_area: deliveryAreaName,
      delivery_area_id: redxAreaId,
      customer_address: addressLine,
      merchant_invoice_id: String(order.id),
      cash_collection_amount: Number(order.total),
      parcel_weight: 500,
      value: Number(order.subtotal),
      pickup_store_id: pickupStoreId,
      is_closed_box: true,
      parcel_details_json: JSON.stringify(
        products.map((product: JsonObject) => ({
          name: product.title ?? "Product",
          quantity:
            quantityMap.get(String(product.id)) ?? 0,
        }))
      ),
    };

    let parcelData: any;

    try {
      const parcelResponse = await fetch(
        `${baseUrl}/parcel`,
        {
          method: "POST",
          headers: {
            "API-ACCESS-TOKEN": `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(parcelPayload),
          cache: "no-store",
          signal: AbortSignal.timeout(20000),
        }
      );

      const parcelText = await parcelResponse.text();

      try {
        parcelData = JSON.parse(parcelText);
      } catch {
        parcelData = { raw: parcelText };
      }

      if (!parcelResponse.ok) {
        console.error("[REDX] Parcel API failed:", {
          status: parcelResponse.status,
          response: parcelData,
        });

        await admin
          .from("shipments")
          .update({ status: "failed" })
          .eq("id", shipment.id);

        return NextResponse.json({
          success: true,
          message:
            "Order তৈরি হয়েছে, কিন্তু REDX parcel তৈরি হয়নি।",
          orderId: order.id,
          total: order.total,
          cartCleared,
          shipment: {
            created: false,
            stage: "redx_parcel",
            httpStatus: parcelResponse.status,
          },
        });
      }
    } catch (error) {
      console.error(
        "[REDX] Parcel request failed:",
        getErrorMessage(error)
      );

      await admin
        .from("shipments")
        .update({ status: "failed" })
        .eq("id", shipment.id);

      return NextResponse.json({
        success: true,
        message:
          "Order তৈরি হয়েছে, কিন্তু REDX API-এর সঙ্গে সংযোগ করা যায়নি।",
        orderId: order.id,
        total: order.total,
        cartCleared,
        shipment: {
          created: false,
          stage: "redx_connection",
          error: getErrorMessage(error),
        },
      });
    }

    // 18. Extract tracking ID

    const trackingNumber =
      parcelData?.tracking_id ??
      parcelData?.data?.tracking_id ??
      parcelData?.parcel?.tracking_id ??
      parcelData?.data?.parcel?.tracking_id ??
      null;

    if (!trackingNumber) {
      console.error(
        "[REDX] Tracking ID missing:",
        parcelData
      );

      await admin
        .from("shipments")
        .update({ status: "failed" })
        .eq("id", shipment.id);

      return NextResponse.json({
        success: true,
        message:
          "REDX response এসেছে, কিন্তু tracking ID পাওয়া যায়নি।",
        orderId: order.id,
        total: order.total,
        cartCleared,
        shipment: {
          created: false,
          stage: "tracking_id",
        },
      });
    }

    // 19. Save tracking ID

    const {
      error: shipmentUpdateError,
    } = await admin
      .from("shipments")
      .update({
        tracking_number: String(trackingNumber),
        status: "created",
      })
      .eq("id", shipment.id);

    if (shipmentUpdateError) {
      console.error(
        "[SHIPMENT] Tracking update failed:",
        shipmentUpdateError
      );

      return NextResponse.json({
        success: true,
        message:
          "REDX parcel তৈরি হয়েছে, কিন্তু tracking ID save হয়নি।",
        orderId: order.id,
        total: order.total,
        cartCleared,
        shipment: {
          created: true,
          trackingNumber: String(trackingNumber),
          saved: false,
        },
      });
    }

    // 20. COD + REDX success

    return NextResponse.json({
      success: true,
      message:
        "Order এবং REDX parcel সফলভাবে তৈরি হয়েছে।",
      orderId: order.id,
      total: order.total,
      cartCleared,
      shipment: {
        created: true,
        trackingNumber: String(trackingNumber),
        area: deliveryAreaName,
      },
    });
  } catch (error) {
    console.error(
      "[ORDERS] Unexpected error:",
      getErrorMessage(error)
    );

    return NextResponse.json(
      {
        success: false,
        message: "Server-এ অপ্রত্যাশিত সমস্যা হয়েছে।",
        orderId,
      },
      { status: 500 }
    );
  }
}
