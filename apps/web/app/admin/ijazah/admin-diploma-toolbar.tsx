"use client"

import { useRef } from "react"
import { MagnifyingGlass } from "@phosphor-icons/react"

type AdminDiplomaToolbarStatus = "ALL" | "VALID" | "REVOKED"

type AdminDiplomaToolbarProps = {
  q: string
  status: AdminDiplomaToolbarStatus
  perPage: number
}

export default function AdminDiplomaToolbar({
  q,
  status,
  perPage,
}: AdminDiplomaToolbarProps) {
  const formRef = useRef<HTMLFormElement>(null)

  function submitForm() {
    formRef.current?.requestSubmit()
  }

  return (
    <form
      ref={formRef}
      action="/admin/ijazah"
      method="GET"
      className="flex flex-col gap-4 border-b border-slate-200 p-6 lg:flex-row lg:items-center lg:justify-between"
    >
      <input type="hidden" name="page" value="1" />

      <div className="relative w-full lg:max-w-md">
        <MagnifyingGlass className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nama, NIM, nomor ijazah, prodi, atau tahun lulus..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
        />

        <button type="submit" className="sr-only">
          Cari
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          name="status"
          defaultValue={status}
          onChange={submitForm}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
        >
          <option value="ALL">Semua Status</option>
          <option value="VALID">Valid</option>
          <option value="REVOKED">Dicabut</option>
        </select>

        <select
          name="perPage"
          defaultValue={String(perPage)}
          onChange={submitForm}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </select>
      </div>
    </form>
  )
}