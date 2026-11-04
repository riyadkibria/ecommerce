import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Supabase server client.
    // Login is NOT required to view active delivery services.
    const supabase = await createClient();

    // Fetch active couriers for both guest and authenticated users.
    const { data, error } = await supabase
      .from("couriers")
      .select("slug, name, cost")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load couriers:", error.message);

      return NextResponse.json(
        {
          success: false,
          message: "Could not load delivery charges.",
        },
        { status: 500 }
      );
    }

    // Normalize and validate courier data.
    const couriers = (data ?? [])
      .filter((courier) => {
        const slug = String(courier.slug ?? "").toLowerCase();
        const name = String(courier.name ?? "").trim();
        const cost = Number(courier.cost);

        return (
          (slug === "redx" || slug === "steadfast") &&
          name.length > 0 &&
          courier.cost !== null &&
          courier.cost !== "" &&
          Number.isFinite(cost) &&
          cost >= 0
        );
      })
      .map((courier) => ({
        slug: String(courier.slug).toLowerCase(),
        name: String(courier.name).trim(),
        cost: Number(courier.cost),
      }));

    return NextResponse.json(
      {
        success: true,
        data: couriers,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Courier API error:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while loading delivery services.",
      },
      { status: 500 }
    );
  }
}