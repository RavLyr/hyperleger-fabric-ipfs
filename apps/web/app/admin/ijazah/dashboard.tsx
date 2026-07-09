import Link from "next/link"
import AdminShell from "@/components/ui/admin-shell"
import Footer from "@/components/ui/footer"
import { FileText, Plus, SealCheck, WarningCircle } from "@phosphor-icons/react/dist/ssr"
import AdminDashboardTable from "./dashboard-table"
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
  const issuerName = session.organizationName ?? session.issuerId ?? "Admin"

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

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-7xl px-6 py-10">
        <section className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
              Data Ijazah
            </h1>
            <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-slate-500">
              <p>
                Login sebagai: <span className="font-semibold text-slate-700">{issuerName}</span>
              </p>
              {session.issuerId && (
                <>
                  <span className="hidden sm:inline text-slate-300">•</span>
                  <p>
                    Issuer ID: <span className="font-mono text-slate-700">{session.issuerId}</span>
                  </p>
                </>
              )}
            </div>
          </div>

          <Link
            href="/admin/ijazah/add"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <Plus weight="bold" className="h-4 w-4" />
            Tambah Ijazah
          </Link>
        </section>

        <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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

        <AdminDashboardTable
          certificates={allCertificates}
          initialQ={q}
          initialStatus={status}
          initialPage={requestedPage}
          initialPerPage={perPage}
        />
      </main>

      <Footer />
    </AdminShell>
  )
}
