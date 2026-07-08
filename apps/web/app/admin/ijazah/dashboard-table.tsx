"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import {
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react"
import type { DatabaseCertificate } from "@/lib/backend-api/types"

const allowedPerPage = [10, 25, 50] as const

type StatusFilter = "ALL" | "VALID" | "REVOKED"

type AdminDashboardTableProps = {
  certificates: DatabaseCertificate[]
  initialQ: string
  initialStatus: StatusFilter
  initialPage: number
  initialPerPage: number
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value)
}

function normalizeCertificateStatus(status?: string | null) {
  return String(status ?? "").toUpperCase()
}

function isValidStatus(status?: string | null) {
  const normalizedStatus = normalizeCertificateStatus(status)

  return normalizedStatus === "VALID" || normalizedStatus === "ACTIVE"
}

function isRevokedStatus(status?: string | null) {
  return normalizeCertificateStatus(status) === "REVOKED"
}

function matchStatus(certificate: DatabaseCertificate, status: StatusFilter) {
  if (status === "ALL") return true
  if (status === "VALID") return isValidStatus(certificate.status)
  if (status === "REVOKED") return isRevokedStatus(certificate.status)

  return true
}

function getStatusBadge(status?: string | null) {
  if (isValidStatus(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
        <ShieldCheck weight="fill" className="h-3.5 w-3.5" />
        VALID
      </span>
    )
  }

  if (isRevokedStatus(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
        <WarningCircle weight="fill" className="h-3.5 w-3.5" />
        REVOKED
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
      <ShieldCheck weight="fill" className="h-3.5 w-3.5" />
      {normalizeCertificateStatus(status) || "UNKNOWN"}
    </span>
  )
}

function getPaginationNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5

  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const half = Math.floor(maxVisiblePages / 2)
  let start = Math.max(1, currentPage - half)
  const end = Math.min(totalPages, start + maxVisiblePages - 1)

  if (end - start + 1 < maxVisiblePages) {
    start = Math.max(1, end - maxVisiblePages + 1)
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function includesQuery(value: unknown, q: string) {
  return String(value ?? "").toLowerCase().includes(q.toLowerCase())
}

function getCertificateTitle(certificate: DatabaseCertificate) {
  return certificate.degreeTitle ?? certificate.title ?? "-"
}

function getOrganizationName(certificate: DatabaseCertificate) {
  return (
    certificate.organizationName ??
    certificate.universityName ??
    certificate.issuerId ??
    "-"
  )
}

function matchSearch(certificate: DatabaseCertificate, q: string) {
  if (!q) return true

  return [
    certificate.certificateNumber,
    certificate.certificateId,
    certificate.issuerId,
    certificate.organizationName,
    certificate.universityName,
    certificate.certificateType,
    certificate.degreeTitle,
    certificate.title,
    certificate.studentId,
    certificate.studentName,
    certificate.faculty,
    certificate.studyProgram,
    certificate.educationLevel,
    certificate.graduationDate,
    certificate.ipfsCid,
    certificate.file_name,
    certificate.mime_type,
    certificate.ledger_tx_id,
    certificate.status,
  ].some((value) => includesQuery(value, q))
}

function sortCertificates(certificates: DatabaseCertificate[]) {
  return [...certificates].sort((a, b) => {
    const dateA = new Date(a.created_at ?? a.issuedAt ?? 0).getTime()
    const dateB = new Date(b.created_at ?? b.issuedAt ?? 0).getTime()

    return dateB - dateA
  })
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-"

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatFileSize(value?: number | null) {
  if (!value) return "-"
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function updateUrl(q: string, status: StatusFilter, page: number, perPage: number) {
  const query = new URLSearchParams()

  if (q) query.set("q", q)
  if (status !== "ALL") query.set("status", status)
  if (page > 1) query.set("page", String(page))
  if (perPage !== 10) query.set("perPage", String(perPage))

  const nextUrl = query.toString()
    ? `/admin/ijazah?${query.toString()}`
    : "/admin/ijazah"

  window.history.replaceState(null, "", nextUrl)
}

export default function AdminDashboardTable({
  certificates,
  initialQ,
  initialStatus,
  initialPage,
  initialPerPage,
}: AdminDashboardTableProps) {
  const [q, setQ] = useState(initialQ)
  const [qDraft, setQDraft] = useState(initialQ)
  const [status, setStatus] = useState(initialStatus)
  const [page, setPage] = useState(initialPage)
  const [perPage, setPerPage] = useState(initialPerPage)
  const [isPending, startTransition] = useTransition()

  const filteredCertificates = useMemo(() => {
    return sortCertificates(
      certificates.filter(
        (certificate) =>
          matchStatus(certificate, status) && matchSearch(certificate, q)
      )
    )
  }, [certificates, q, status])

  const totalFilteredDiplomas = filteredCertificates.length
  const totalPages = Math.max(1, Math.ceil(totalFilteredDiplomas / perPage))
  const currentPage = Math.min(page, totalPages)
  const skip = (currentPage - 1) * perPage
  const diplomas = filteredCertificates.slice(skip, skip + perPage)
  const paginationNumbers = getPaginationNumbers(currentPage, totalPages)
  const startItem = totalFilteredDiplomas === 0 ? 0 : skip + 1
  const endItem = Math.min(skip + diplomas.length, totalFilteredDiplomas)

  function setTableState(next: {
    q?: string
    qDraft?: string
    status?: StatusFilter
    page?: number
    perPage?: number
  }) {
    const nextQ = next.q ?? q
    const nextStatus = next.status ?? status
    const nextPage = next.page ?? page
    const nextPerPage = next.perPage ?? perPage

    startTransition(() => {
      if (next.q !== undefined) setQ(next.q)
      if (next.qDraft !== undefined) setQDraft(next.qDraft)
      if (next.status !== undefined) setStatus(next.status)
      if (next.page !== undefined) setPage(next.page)
      if (next.perPage !== undefined) setPerPage(next.perPage)
    })

    updateUrl(nextQ, nextStatus, nextPage, nextPerPage)
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTableState({ q: qDraft.trim(), page: 1 })
  }

  function handleStatusChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setTableState({ status: event.target.value as StatusFilter, page: 1 })
  }

  function handlePerPageChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setTableState({ perPage: Number(event.target.value), page: 1 })
  }

  function goToPage(nextPage: number) {
    setTableState({ page: nextPage })
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-4 border-b border-slate-200 p-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="relative w-full lg:max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            value={qDraft}
            onChange={(event) => setQDraft(event.target.value)}
            placeholder="Cari nama, NIM, nomor ijazah, prodi, atau tahun lulus..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />

          <button type="submit" className="sr-only">
            Cari
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={status}
            onChange={handleStatusChange}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">Semua Status</option>
            <option value="VALID">Valid</option>
            <option value="REVOKED">Revoke</option>
          </select>

          <select
            value={String(perPage)}
            onChange={handlePerPageChange}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          >
            {allowedPerPage.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="relative overflow-x-auto">
        {isPending ? (
          <div className="absolute inset-x-0 top-0 z-10 border-b border-blue-100 bg-blue-50 px-6 py-2 text-xs font-bold text-blue-700">
            Memuat data...
          </div>
        ) : null}

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Certificate Number
              </th>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Nama / NIM
              </th>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Degree Title
              </th>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Program
              </th>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Issuer
              </th>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                File
              </th>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Terbit
              </th>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-sm">
            {diplomas.length > 0 ? (
              diplomas.map((diploma) => (
                <tr key={diploma.certificateId} className="transition hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="font-mono text-xs font-bold text-slate-900">
                      {diploma.certificateNumber || "-"}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-slate-500">
                      {diploma.certificateId || "-"}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="font-semibold text-slate-900">
                      {diploma.studentName || "-"}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {diploma.studentId || "-"}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="font-semibold text-slate-700">
                      {getCertificateTitle(diploma)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {diploma.certificateType || "IJAZAH"}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="font-semibold text-slate-700">
                      {diploma.studyProgram || "-"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {diploma.faculty || "-"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {diploma.educationLevel || "-"}
                    </p>
                    {diploma.graduationDate ? (
                      <p className="mt-1 text-xs text-slate-400">
                        Lulus: {formatDate(diploma.graduationDate)}
                      </p>
                    ) : null}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="font-semibold text-slate-700">
                      {getOrganizationName(diploma)}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {diploma.issuerId || "-"}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    <p className="max-w-[180px] truncate font-semibold text-slate-700">
                      {diploma.file_name || "-"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatFileSize(diploma.file_size)}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                    {formatDate(diploma.issuedAt)}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4">
                    {getStatusBadge(diploma.status)}
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      href={`/admin/ijazah/${encodeURIComponent(
                        diploma.certificateId
                      )}`}
                      className="font-semibold text-blue-700 transition hover:text-blue-600"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  {q || status !== "ALL"
                    ? "Data ijazah dengan filter tersebut tidak ditemukan."
                    : "Belum ada data ijazah."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <span className="text-sm text-slate-600">
          Menampilkan {formatNumber(startItem)}-{formatNumber(endItem)} dari{" "}
          {formatNumber(totalFilteredDiplomas)} data
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
            className="rounded border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-white"
          >
            <CaretLeft className="h-4 w-4" />
          </button>

          {paginationNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => goToPage(pageNumber)}
              className={`rounded px-3 py-1 text-sm font-bold transition ${
                pageNumber === currentPage
                  ? "bg-blue-700 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
            className="rounded border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-white"
          >
            <CaretRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
