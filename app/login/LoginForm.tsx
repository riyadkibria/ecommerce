
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Figtree } from "next/font/google";
import { useLogin } from "./useLogin";
import { createClient } from "@/app/lib/supabase/client";

const font = Figtree({ subsets: ["latin"], display: "swap" });

const inputClass =
  "h-10 w-full rounded-lg border border-[#DDE3DF] bg-white px-3 text-[13.5px] text-[#14281F] outline-none transition placeholder:text-[#9AA7A0] hover:border-[#B9C4BE] focus:border-[#14281F] focus:ring-4 focus:ring-[#D9B26A]/30 disabled:cursor-not-allowed disabled:bg-[#F4F6F8] disabled:opacity-60";

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#D9B26A]";

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function Spinner({
  className = "h-[18px] w-[18px]",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} animate-spin motion-reduce:animate-none`}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="m4 4 16 16" />}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Logo                                                                       */
/* -------------------------------------------------------------------------- */

function Logo() {
  return (
    <Link
      href="/"
      aria-label="Elevate home"
      className={`flex w-fit items-center gap-2 rounded-lg ${focusRing} focus-visible:ring-offset-2`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#14281F] text-[14px] font-bold text-[#E8D5A3]">
        E
      </span>

      <span className="text-[16px] font-bold tracking-[0.12em]">
        ELEVATE
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Login Page                                                                 */
/* -------------------------------------------------------------------------- */

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const { login, loading, status } = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const busy = loading || googleLoading;

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        setGoogleLoading(false);
      }
    }

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGoogleError(null);

    const success = await login(email, password);

    if (success) {
      router.push("/");
      router.refresh();
    }
  }

  async function handleGoogle() {
    setGoogleError(null);
    setGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Google sign-in error:", error);

      setGoogleError(
        error instanceof Error
          ? error.message
          : "We couldn't connect to Google. Please try again."
      );

      setGoogleLoading(false);
    }
  }

  const errorMessage = status?.message ?? googleError;

  return (
    <main
      className={`${font.className} flex min-h-[100dvh] flex-col bg-white px-5 py-5 text-[#14281F] antialiased sm:px-10`}
    >
      {/* Logo */}
      <header className="mx-auto w-full max-w-6xl">
        <Logo />
      </header>

      {/* ONE LOGIN FORM */}
      <section
        aria-labelledby="login-title"
        className="flex flex-1 items-center justify-center py-8"
      >
        <div className="w-full max-w-[350px]">

          <h1
            id="login-title"
            className="text-center text-[28px] font-bold leading-tight tracking-[-0.04em]"
          >
            Welcome back!
          </h1>

          <p className="mt-2 text-center text-[13px] text-[#14281F]/55">
            Sign in to your Elevate account.
          </p>

          {/* Error */}
          <div aria-live="polite">
            {errorMessage && (
              <div
                role="alert"
                className="mt-4 flex gap-2 rounded-lg border border-[#F0C9C4] bg-[#FDF4F3] px-3 py-2 text-[12.5px] leading-[18px] text-[#9E2F25]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-px h-4 w-4 shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5v5M12 16.5h.01" />
                </svg>

                <p>{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Email and Password Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-[12.5px] font-semibold"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={busy}
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-[12.5px] font-semibold"
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className={`rounded text-[12px] font-semibold text-[#2F6F57] transition hover:text-[#14281F] ${focusRing}`}
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={busy}
                  className={`${inputClass} pr-10`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showPassword}
                  className={`absolute inset-y-0 right-1.5 my-auto flex h-7 w-7 items-center justify-center rounded-md text-[#14281F]/50 transition hover:bg-[#EAF1EC] hover:text-[#14281F] ${focusRing}`}
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </div>

            {/* Sign In */}
            <button
              type="submit"
              disabled={busy}
              className="!mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#14281F] px-4 text-[13.5px] font-semibold text-white outline-none transition duration-200 hover:bg-[#24453A] focus-visible:ring-2 focus-visible:ring-[#D9B26A] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            >
              {loading && <Spinner className="h-4 w-4" />}

              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* OR */}
          <div className="my-4 flex items-center gap-3 text-[12px] text-[#14281F]/50">
            <span className="h-px flex-1 bg-[#14281F]/10" />
            or
            <span className="h-px flex-1 bg-[#14281F]/10" />
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            aria-busy={googleLoading}
            className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-[#DDE3DF] bg-white px-4 text-[13.5px] font-semibold text-[#14281F] outline-none transition duration-200 hover:border-[#14281F] hover:bg-[#F4F6F8] focus-visible:ring-2 focus-visible:ring-[#D9B26A] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {googleLoading ? <Spinner /> : <GoogleIcon />}

            {googleLoading
              ? "Connecting to Google..."
              : "Continue with Google"}
          </button>

          {/* Register */}
          <p className="mt-4 text-center text-[12.5px] text-[#14281F]/65">
            New to Elevate?{" "}

            <Link
              href="/register"
              className={`rounded font-semibold text-[#14281F] underline decoration-[#D9B26A] decoration-2 underline-offset-4 transition hover:text-[#2F6F57] ${focusRing}`}
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <p className="text-center text-[11px] leading-4 text-[#14281F]/45">
          By signing in, you agree to our{" "}

          <Link
            href="/terms"
            className={`rounded underline underline-offset-2 hover:text-[#14281F] ${focusRing}`}
          >
            Terms
          </Link>

          {" "}and{" "}

          <Link
            href="/privacy"
            className={`rounded underline underline-offset-2 hover:text-[#14281F] ${focusRing}`}
          >
            Privacy Policy
          </Link>
          .
        </p>
      </footer>
    </main>
  );
}
