"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type RegisterResponse = {
  success?: boolean
  message?: string
}

export default function RegisterIssuerForm() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoading(true)
    setErrorMessage("")
    setSuccessMessage("")

    const formData = new FormData(event.currentTarget)

    const name = String(formData.get("name") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim().toLowerCase()
    const password = String(formData.get("password") ?? "")
    const confirmPassword = String(formData.get("confirmPassword") ?? "")

    const issuerId = String(formData.get("issuerId") ?? "")
      .trim()
      .toUpperCase()

    const organizationName = String(
      formData.get("organizationName") ?? ""
    ).trim()

    const departmentName = String(formData.get("departmentName") ?? "").trim()
    const mspId = String(formData.get("mspId") ?? "").trim()

    if (
      !name ||
      !email ||
      !password ||
      !confirmPassword ||
      !issuerId ||
      !organizationName ||
      !departmentName ||
      !mspId
    ) {
      setErrorMessage("Semua field wajib diisi.")
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setErrorMessage("Password minimal 8 karakter.")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi password tidak sama.")
      setLoading(false)
      return
    }

    const payload = {
      name,
      email,
      password,
      confirmPassword,

      issuerId,
      organizationName,
      departmentName,
      mspId,
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as RegisterResponse

      if (!response.ok) {
        setErrorMessage(data.message || "Registrasi gagal.")
        return
      }

      setSuccessMessage("Registrasi issuer berhasil. Mengarahkan ke login...")

      setTimeout(() => {
        router.push("/login?registered=1")
      }, 900)
    } catch (error) {
      console.error(error)
      setErrorMessage("Tidak dapat terhubung ke server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">
          Registrasi Issuer
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Buat akun admin lokal dan daftarkan institusi penerbit ke sistem
          ledger.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label
            htmlFor="name"
            className="text-sm font-semibold text-slate-700"
          >
            Nama Admin
          </label>

          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Contoh: Admin Fakultas Teknik"
            autoComplete="name"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="email"
            className="text-sm font-semibold text-slate-700"
          >
            Email
          </label>

          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="admin@kampus.ac.id"
            autoComplete="email"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="text-sm font-semibold text-slate-700"
          >
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="text-sm font-semibold text-slate-700"
          >
            Konfirmasi Password
          </label>

          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            placeholder="Ulangi password"
            autoComplete="new-password"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="issuerId"
            className="text-sm font-semibold text-slate-700"
          >
            Issuer ID
          </label>

          <input
            id="issuerId"
            name="issuerId"
            type="text"
            required
            placeholder="Contoh: ISSUER_01"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm uppercase outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="mspId"
            className="text-sm font-semibold text-slate-700"
          >
            Organisasi Fabric
          </label>

          <select
            id="mspId"
            name="mspId"
            required
            defaultValue=""
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          >
            <option value="" disabled>
              Pilih organisasi Fabric
            </option>
            <option value="Org1MSP">Org1MSP</option>
            <option value="Org2MSP">Org2MSP</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="organizationName"
            className="text-sm font-semibold text-slate-700"
          >
            Nama Organisasi / Universitas
          </label>

          <input
            id="organizationName"
            name="organizationName"
            type="text"
            required
            placeholder="Contoh: Universitas Diponegoro"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="departmentName"
            className="text-sm font-semibold text-slate-700"
          >
            Departemen / Fakultas
          </label>

          <input
            id="departmentName"
            name="departmentName"
            type="text"
            required
            placeholder="Contoh: Fakultas Teknik"
            className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Memproses..." : "Daftar Issuer"}
      </button>
    </form>
  )
}