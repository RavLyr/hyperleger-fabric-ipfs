"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { Eye, EyeSlash } from "@phosphor-icons/react"

type LoginResponse = {
  success?: boolean
  message?: string
}

function getSafeCallbackUrl(value: string | null) {
  if (!value) {
    return "/admin/ijazah"
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/admin/ijazah"
  }

  if (value === "/login" || value.startsWith("/login?")) {
    return "/admin/ijazah"
  }

  return value
}

export default function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"))
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cleanedIdentifier = identifier.trim()

    if (!cleanedIdentifier || !password) {
      setMessage("Username/email")
      return
    }

    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: cleanedIdentifier,
          password,
        }),
      })

      const result = (await response.json()) as LoginResponse

      if (!response.ok || result.success === false) {
        setMessage(result.message || "Login gagal.")
        return
      }

      window.location.replace(callbackUrl)
    } catch {
      setMessage("Gagal menghubungi server.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold text-slate-950">Login Admin</h1>

        <div className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="identifier"
              className="text-sm font-medium text-slate-900"
            >
              Username
            </label>

            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Contoh: admin"
              autoComplete="username"
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-900"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-11 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <EyeSlash className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
        </div>

        {message && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-6 w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Memproses..." : "Login"}
        </button>

        {/* <p className="mt-6 text-center text-sm text-slate-600">
          Belum punya akun issuer?{" "}
          <Link
            href="/register"
            className="font-bold text-blue-700 hover:text-blue-600"
          >
            Registrasi Issuer
          </Link>
        </p> */}
      </form>
    </main>
  )
}