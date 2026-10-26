
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLogin } from "./useLogin";

export default function LoginForm() {
  const router = useRouter();
  const { login, loading, status } = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const success = await login(email, password);

    if (success) {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf9f6] px-5 py-8 text-[#25251f]">
      <section className="w-full max-w-[360px]">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold tracking-[0.12em]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#25251f] text-xs text-[#e8d5a3]">
            E
          </span>
          ELEVATE
        </Link>

        <header className="mb-6">
          <h1 className="text-[27px] font-semibold leading-tight tracking-[-0.04em]">
            Welcome back
          </h1>

          <p className="mt-2 text-[13px] leading-5 text-[#77766e]">
            Sign in to continue shopping.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-medium text-[#494940]"
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
              disabled={loading}
              className="h-11 w-full rounded-md border border-[#e5e2d9] bg-white px-3 text-[13px] outline-none transition placeholder:text-[#aaa89f] focus:border-[#9c8247] disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-[#494940]"
            >
              Password
            </label>

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
                disabled={loading}
                className="h-11 w-full rounded-md border border-[#e5e2d9] bg-white px-3 pr-14 text-[13px] outline-none transition placeholder:text-[#aaa89f] focus:border-[#9c8247] disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-3 text-xs text-[#77766e] hover:text-[#25251f]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-md bg-[#25251f] px-4 text-[13px] font-medium text-white transition hover:bg-[#3c3b32] focus:outline-none focus:ring-2 focus:ring-[#9c8247]/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {status && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-[#fbefed] px-3 py-2.5 text-xs leading-5 text-[#963e35]"
          >
            {status.message}
          </p>
        )}

        <p className="mt-5 text-center text-xs text-[#77766e]">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-[#25251f] underline underline-offset-4 decoration-[#c9b98f] hover:decoration-[#25251f]"
          >
            Create account
          </Link>
        </p>

        <p className="mt-8 text-center text-[10px] leading-4 text-[#99978e]">
          Secure sign-in powered by Supabase.
        </p>
      </section>
    </main>
  );
}
