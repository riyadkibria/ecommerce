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

function getErrorMessage(error: unknown): string {

  if (error instanceof Error) return error.message;

  if (typeof error === "string") return error;

  try {

    return JSON.stringify(error);

  } catch {

    return "Unknown error";

  }

}

export async function POST(request: Request) {

  let orderId: string | number | null = null;

  try {

    // 1. Check Supabase configuration

    const supabaseUrl =

      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =

      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {

      console.error(

        "[ORDERS] Supabase server configuration missing"

      );

      return errorResponse(

        "Supabase server configuration ঠিক নেই।",

        500

      );

    }

    // 2. Read request body

    const body = await request.json();

    const fullName = String(

      body.fullName ?? body.name ?? ""

    ).trim();

    const phone = String(body.phone ?? "").trim();

    const city = String(body.city ?? "Dhaka").trim();

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

    if (paymentMethod !== "cod") {

      return errorResponse(

        "এই API route-এ আপাতত শুধু Cash on Delivery চালু আছে।",

        400

      );

    }

    if (

      courierSlug === "redx" &&

      (!Number.isInteger(redxAreaId) || redxAreaId <= 0)

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

    // 3. Check REDX configuration before creating an order

    let baseUrl = "";

    let token = "";

    let pickupStoreId = 0;

    if (courierSlug === "redx") {

      // Supports the existing REDX_BASE_URL variable.

      // REDX_API_URL is used as a fallback.

      baseUrl = (

        process.env.REDX_BASE_URL ??

        process.env.REDX_API_URL ??

        ""

      ).replace(/\/+$/, "");

      token = process.env.REDX_ACCESS_TOKEN ?? "";

      pickupStoreId = Number(

        process.env.REDX_PICKUP_STORE_ID

      );

      const validPickupStoreId =

        Number.isInteger(pickupStoreId) &&

        pickupStoreId > 0;

      if (!baseUrl || !token || !validPickupStoreId) {

        console.error(

          "[REDX] Configuration check:",

          {

            hasBaseUrl: Boolean(baseUrl),

            hasToken: Boolean(token),

            pickupStoreId,

            validPickupStoreId,

          }

        );

        return errorResponse(

          "REDX configuration ঠিক নেই। Terminal-এর [REDX] Configuration check দেখো।",

          500

        );

      }

    }

    // 4. Create Supabase admin client

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

    // 5. Get logged-in user, if available

    let userId: string | null = null;

    try {

      const supabase = await createClient();

      const {

        data: { user },

        error: userError,

      } = await supabase.auth.getUser();

      if (!userError && user) {

        userId = user.id;

      }

    } catch (error) {

      console.warn(

        "[ORDERS] Could not read logged-in user:",

        getErrorMessage(error)

      );

    }

    // 6. Validate cart items

    const requestedItems = items.map(

      (item: JsonObject) => ({

        productId: String(

          item.productId ?? item.product_id ?? ""

        ).trim(),

        quantity: Number(item.quantity),

      })

    );

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

    // Combine duplicate product IDs

    const quantityMap = new Map<string, number>();

    for (const item of requestedItems) {

      quantityMap.set(

        item.productId,

        (quantityMap.get(item.productId) ?? 0) +

          item.quantity

      );

    }

    const productIds = Array.from(quantityMap.keys());

    // 7. Fetch products from database

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

    // IMPORTANT:

    // order_items uses product_title and price,

    // not unit_price and total_price.

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

        Number(product.stock) < quantity

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

    // 8. Get selected courier

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

    if (!courier) {

      return errorResponse(

        "নির্বাচিত courier database-এ পাওয়া যায়নি।"

      );

    }

    const shippingCost = Number(courier.cost ?? 0);

    const tax = 0;

    const total = subtotal + shippingCost + tax;

    if (

      !Number.isFinite(shippingCost) ||

      shippingCost < 0

    ) {

      return errorResponse(

        "Courier delivery charge সঠিক নয়।",

        500

      );

    }

    // 9. Verify REDX area before creating the order

    let deliveryAreaName = "";

    if (courierSlug === "redx") {

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

          console.error(

            "[REDX] Areas API failed:",

            {

              status: areasResponse.status,

              response: areasData,

            }

          );

          return errorResponse(

            "REDX area যাচাই করা যায়নি। Terminal পরীক্ষা করো।",

            502

          );

        }

        deliveryAreaName =

          findAreaName(areasData, redxAreaId) ?? "";

        if (!deliveryAreaName) {

          return errorResponse(

            "নির্বাচিত REDX area API-তে পাওয়া যায়নি।",

            400

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

          courierSlug === "redx"

            ? redxAreaId

            : null,

        subtotal,

        shipping_cost: shippingCost,

        tax,

        total,

        payment_method: "cod",

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

    // 11. Insert order items using the actual table columns

    const itemsToInsert = orderItems.map((item) => ({

      order_id: order.id,

      product_id: item.product_id,

      product_title: item.product_title,

      quantity: item.quantity,

      price: item.price,

    }));

    const {

      error: orderItemsError,

    } = await admin

      .from("order_items")

      .insert(itemsToInsert);

    if (orderItemsError) {

      console.error(

        "[ORDERS] Order items insert failed:",

        orderItemsError

      );

      // Mark the order as failed so it is not treated as complete.

      const { error: statusUpdateError } = await admin

        .from("orders")

        .update({ status: "failed" })

        .eq("id", order.id);

      if (statusUpdateError) {

        console.error(

          "[ORDERS] Failed to update order status:",

          statusUpdateError

        );

      }

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

    // 11.5 Clear the authenticated user's database cart only after
    // the order and all order_items have been saved successfully.
    // Guest carts live in localStorage and must be cleared by CheckoutClient.
    let cartCleared = false;

    if (userId) {
      const { error: cartDeleteError } = await admin
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (cartDeleteError) {
        // Do not fail an already-created order if cart cleanup fails.
        console.error(
          "[ORDERS] Cart clear failed:",
          cartDeleteError
        );
      } else {
        cartCleared = true;
        console.log("[ORDERS] User cart cleared:", userId);
      }
    }

    // 12. Steadfast parcel automation is not implemented here

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

            "Steadfast parcel automation এখনো এই route-এ চালু করা হয়নি।",

        },

      });

    }

    // 13. Create REDX shipment record

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

    // 14. Create REDX parcel

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

        }

      );

      const parcelText = await parcelResponse.text();

      try {

        parcelData = JSON.parse(parcelText);

      } catch {

        parcelData = { raw: parcelText };

      }

      if (!parcelResponse.ok) {

        console.error(

          "[REDX] Parcel API failed:",

          {

            status: parcelResponse.status,

            response: parcelData,

          }

        );

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

            error: parcelData,

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

    // 15. Extract tracking ID

    const trackingNumber =

      parcelData?.tracking_id ??

      parcelData?.data?.tracking_id ??

      parcelData?.parcel?.tracking_id ??

      parcelData?.data?.parcel?.tracking_id ??

      null;

    if (!trackingNumber) {

      console.error(

        "[REDX] Parcel response did not contain tracking_id:",

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

          response: parcelData,

        },

      });

    }

    // 16. Save tracking ID

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

          "REDX parcel তৈরি হয়েছে, কিন্তু tracking ID database-এ save হয়নি।",

        orderId: order.id,

        total: order.total,
        cartCleared,

        shipment: {

          created: true,

          trackingNumber: String(trackingNumber),

          saved: false,

          error: shipmentUpdateError.message,

        },

      });

    }

    // 17. Success

    return NextResponse.json({

      success: true,

      message:

        "Order এবং REDX parcel সফলভাবে তৈরি হয়েছে।",

      orderId: order.id,

      total: order.total,

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
