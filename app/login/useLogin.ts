
"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

type LoginStatus = {
  success: boolean;
  message: string;
};

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<LoginStatus | null>(null);

  async function login(email: string, password: string) {
    setLoading(true);
    setStatus(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setStatus({
          success: false,
          message: error.message,
        });

        return false;
      }

      return true;
    } catch {
      setStatus({
        success: false,
        message: "Something went wrong. Please try again.",
      });

      return false;
    } finally {
      setLoading(false);
    }
  }

  return {
    login,
    loading,
    status,
  };
}
