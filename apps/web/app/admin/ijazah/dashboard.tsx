import Link from "next/link"
import AdminShell from "@/components/ui/admin-shell"
import Footer from "@/components/ui/footer"
import {
  CaretLeft,
  CaretRight,
  FileText,
  Plus,
  SealCheck,
  WarningCircle,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr"
import AdminDiplomaToolbar from "./admin-diploma-toolbar"
import { getIssuerScope, requireAdminSession } from "@/lib/auth/session"
import {
  getDatabaseCertificates,
  getLedgerCertificates,
} from "@/lib/backend-api/certificates"
import type {
  DatabaseCertificate,
  LedgerCertificateAsset,
} from "@/lib/backend-api/types"

const statusFilters = ["ALL", "VALID", "REVOKED"] as const
const allowedPerPage = [10, 25, 50] as const

type StatusFilter = (typeof statusFilters)[number]

type DashboardProps = {
  searchParams?: Promise<{
    q?: string
    status?: string
    page?: string
    perPage?: string
  }>
}

export const dynamic = "force-dynamic"
export const revalidate = 0

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value)
}

function normalizeStatus(value?: string): StatusFilter {
  const upperValue = String(value ?? "ALL").toUpperCase()

  if (statusFilters.includes(upperValue as StatusFilter)) {
    return upperValue as StatusFilter
  }

  return "ALL"
}

function normalizePage(value?: string) {
  const page = Number(value)

  if (!Number.isInteger(page) || page < 1) {
    return 1
  }

  return page
}

function normalizePerPage(value?: string) {
  const perPage = Number(value)

  if (allowedPerPage.includes(perPage as (typeof allowedPerPage)[number])) {
    return perPage
  }

  return 10
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
  if (status === "ALL") {
    return true
  }

  if (status === "VALID") {
    return isValidStatus(certificate.status)
  }

  if (status === "REVOKED") {
    return isRevokedStatus(certificate.status)
  }

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
  if (!q) {
    return true
  }

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

function filterCertificates(
  certificates: DatabaseCertificate[],
  q: string,
  status: StatusFilter
) {
  return certificates.filter(
    (certificate) =>
      matchStatus(certificate, status) && matchSearch(certificate, q)
  )
}

function sortCertificates(certificates: DatabaseCertificate[]) {
  return [...certificates].sort((a, b) => {
    const dateA = new Date(a.created_at ?? a.issuedAt ?? 0).getTime()
    const dateB = new Date(b.created_at ?? b.issuedAt ?? 0).getTime()

    return dateB - dateA
  })
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-"
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatFileSize(value?: number | null) {
  if (!value) {
    return "-"
  }

  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function mergeDatabaseWithLedgerStatus(
  databaseCertificates: DatabaseCertificate[],
  ledgerCertificates: LedgerCertificateAsset[]
) {
  const ledgerStatusMap = new Map(
    ledgerCertificates.map((certificate) => [
      certificate.certificateId,
      certificate.status,
    ])
  )

  return databaseCertificates.map((certificate) => {
    const ledgerStatus = ledgerStatusMap.get(certificate.certificateId)

    return {
      ...certificate,
      status: ledgerStatus ?? certificate.status,
    }
  })
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  const params = (await searchParams) ?? {}

  const q = params.q?.trim() ?? ""
  const status = normalizeStatus(params.status)
  const requestedPage = normalizePage(params.page)
  const perPage = normalizePerPage(params.perPage)

  const session = await requireAdminSession()
  const issuerScope = getIssuerScope(session)

  const [databaseCertificates, ledgerCertificates] = await Promise.all([
    getDatabaseCertificates(issuerScope),
    getLedgerCertificates(issuerScope).catch(() => []),
  ])

  const allCertificates = mergeDatabaseWithLedgerStatus(
    databaseCertificates,
    ledgerCertificates
  )

  const totalDiplomas = allCertificates.length

  const totalValid = allCertificates.filter((certificate) =>
    isValidStatus(certificate.status)
  ).length

  const totalRevoked = allCertificates.filter((certificate) =>
    isRevokedStatus(certificate.status)
  ).length

  const filteredCertificates = sortCertificates(
    filterCertificates(allCertificates, q, status)
  )

  const totalFilteredDiplomas = filteredCertificates.length
  const totalPages = Math.max(1, Math.ceil(totalFilteredDiplomas / perPage))
  const currentPage = Math.min(requestedPage, totalPages)
  const skip = (currentPage - 1) * perPage

  const diplomas = filteredCertificates.slice(skip, skip + perPage)
  const paginationNumbers = getPaginationNumbers(currentPage, totalPages)

  const startItem = totalFilteredDiplomas === 0 ? 0 : skip + 1
  const endItem = Math.min(skip + diplomas.length, totalFilteredDiplomas)

  function getPageHref(page: number) {
    const query = new URLSearchParams()

    if (q) {
      query.set("q", q)
    }

    if (status !== "ALL") {
      query.set("status", status)
    }

    query.set("page", String(page))
    query.set("perPage", String(perPage))

    return `/admin/ijazah?${query.toString()}`
  }

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-7xl px-6 py-10">
        <section className="mb-14 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Data Ijazah
            </h1>
          </div>

          <Link
            href="/admin/ijazah/add"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <Plus weight="bold" className="h-4 w-4" />
            Tambah Ijazah
          </Link>
        </section>

        <section className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
            <div className="mb-4 flex items-start justify-between">
              <span className="text-sm font-medium text-slate-600">
                Total Ijazah
              </span>
              <FileText className="h-5 w-5 text-slate-400" />
            </div>

            <p className="text-4xl font-bold tracking-tight text-slate-950">
              {formatNumber(totalDiplomas)}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
            <div className="absolute inset-0 bg-blue-500/5" />

            <div className="relative mb-4 flex items-start justify-between">
              <span className="text-sm font-medium text-slate-600">Valid</span>
              <SealCheck weight="fill" className="h-5 w-5 text-blue-700" />
            </div>

            <p className="relative text-4xl font-bold tracking-tight text-slate-950">
              {formatNumber(totalValid)}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-red-200 bg-white p-6 shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
            <div className="absolute inset-0 bg-red-500/5" />

            <div className="relative mb-4 flex items-start justify-between">
              <span className="text-sm font-medium text-slate-600">
                Revoked
              </span>
              <WarningCircle weight="fill" className="h-5 w-5 text-red-700" />
            </div>

            <p className="relative text-4xl font-bold tracking-tight text-slate-950">
              {formatNumber(totalRevoked)}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
          <AdminDiplomaToolbar q={q} status={status} perPage={perPage} />

          <div className="overflow-x-auto">
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
                    <tr
                      key={diploma.certificateId}
                      className="group transition hover:bg-slate-50"
                    >
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
                          className="font-semibold text-blue-700 opacity-0 transition hover:text-blue-600 group-hover:opacity-100"
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
              {currentPage > 1 ? (
                <Link
                  href={getPageHref(currentPage - 1)}
                  className="rounded border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-50"
                >
                  <CaretLeft className="h-4 w-4" />
                </Link>
              ) : (
                <span className="rounded border border-slate-200 px-3 py-1 text-slate-300">
                  <CaretLeft className="h-4 w-4" />
                </span>
              )}

              {paginationNumbers.map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={getPageHref(pageNumber)}
                  className={`rounded px-3 py-1 text-sm font-bold transition ${
                    pageNumber === currentPage
                      ? "bg-blue-700 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pageNumber}
                </Link>
              ))}

              {currentPage < totalPages ? (
                <Link
                  href={getPageHref(currentPage + 1)}
                  className="rounded border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-50"
                >
                  <CaretRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="rounded border border-slate-200 px-3 py-1 text-slate-300">
                  <CaretRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </AdminShell>
  )
}