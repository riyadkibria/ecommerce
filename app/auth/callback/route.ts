import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Google থেকে পাওয়া temporary authorization code
  const code = searchParams.get("code");

  // Login successful হলে কোথায় redirect করবে
  const next = searchParams.get("next") ?? "/";

  // Open redirect আটকানো: শুধু নিজের website-এর relative path গ্রহণ করবে
  const redirectUrl = new URL(next, origin);
  const safeNext =
    next.startsWith("/") &&
    !next.startsWith("//") &&
    redirectUrl.origin === origin
      ? redirectUrl
      : new URL("/", origin);

  if (code) {
    const supabase = await createClient();

    // Authorization code exchange করে Supabase session তৈরি
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(safeNext);
    }
  }

  // Code missing বা exchange ব্যর্থ হলে login page-এ ফেরত পাঠাবে
  return NextResponse.redirect(
    new URL("/login?error=google-auth", origin)
  );
}