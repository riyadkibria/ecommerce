
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";


export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogout() {
    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signOut();

      if (error) {
        setErrorMessage("Logout failed. Please try again.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="rounded-md bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Logging out..." : "Logout"}
      </button>

      {errorMessage && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {errorMessage}
        </p>
      )}  
    </div>   
  );
}
