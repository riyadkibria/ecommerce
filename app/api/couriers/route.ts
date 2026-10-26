
import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, message: "Please log in first." },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("couriers")
    .select("slug, name, cost")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Failed to load couriers:", error.message);

    return NextResponse.json(
      { success: false, message: "Could not load delivery charges." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: (data ?? []).map((courier) => ({
      slug: courier.slug,
      name: courier.name,
      cost: Number(courier.cost),
    })),
  });
}
