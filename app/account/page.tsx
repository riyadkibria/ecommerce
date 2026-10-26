
import { createClient } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">
        My Account
      </h1>

      <p className="mt-3 text-gray-600">
        Welcome to your account.
      </p>

      <div className="mt-6 rounded-lg border p-5">
        <h2 className="text-lg font-medium">
          Account Information
        </h2>

        <p className="mt-3 text-sm text-gray-600">
          Email: {user.email ?? "No email available"}
        </p>

        <p className="mt-2 text-sm text-green-700">
          You are logged in.
        </p>
      </div>
      <LogoutButton />
    </main>
  );
}
