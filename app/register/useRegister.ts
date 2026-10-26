
"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

type RegisterStatus = {
  success: boolean;
  message: string;
};

export function useRegister() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<RegisterStatus | null>(null);

  async function register(email: string, password: string) {
    setLoading(true);
    setStatus(null);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setStatus({
          success: false,
          message: error.message,
        });
        return;
      }

      if (data.session) {
        setStatus({
          success: true,
          message: "Your account has been created successfully.",
        });
      } else {
        setStatus({
          success: true,
          message:
            "Account created! Please check your email to verify your account.",
        });
      }
    } catch {
      setStatus({
        success: false,
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return {
    register,
    loading,
    status,
  };
}
