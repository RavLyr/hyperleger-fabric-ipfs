import Link from "next/link"
import { notFound } from "next/navigation"
import AdminShell from "@/components/ui/admin-shell"
import Footer from "@/components/ui/footer"
import { getIssuerScope, requireAdminSession } from "@/lib/auth/session"
import { backendFetch } from "@/lib/backend-api/client"
import RevokeDiplomaForm from "./revoke-form"

type AdminDiplomaDetailPageProps = {
  params: Promise<{
    id: string
  }>
}

type BackendResponse<T> = {
  success?: boolean
  message?: string
  data?: T
  error?: {
    message?: string
  }
}

type LedgerCertificate = {
  docType?: string | null
  certificateId: string
  certificateNumber: string
  studentIdHash?: string | null
  issuerId: string
  certificateType: string
  title: string
  ipfsCid?: string | null
  status: string
  issuedAt?: string | null
  expiredAt?: string | null
  previousCertificateId?: string | null
  replacementCertificateId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  degreeTitle?: string | null
}

type DatabaseCertificate = {
  id: number
  certificateId: string
  certificateNumber: string
  issuerId: string
  certificateType: string

  degreeTitle: string

  studentId: string
  studentName: string
  organizationName?: string | null
  universityName?: string | null
  faculty?: string | null

  studyProgram: string
  educationLevel: string
  graduationDate?: string | null

  ipfsCid?: string | null
  file_name?: string | null
  mime_type?: string | null
  file_size?: number | null
  ledger_tx_id?: string | null

  status?: string | null
  issuedAt?: string | null
  created_at?: string | null
  updated_at?: string | null
  title?: string | null
  studentIdHash?: string | null
  documentHash?: string | null
  expiredAt?: string | null
  previousCertificateId?: string | null
  replacementCertificateId?: string | null
}

type Issuer = {
  issuerId: string
  organizationName?: string | null
  departmentName?: string | null
  mspId?: string | null
  status?: string | null
}

type Revocation = {
  certificateId?: string | null
  reasonHash?: string | null
  revokedAt?: string | null
}

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getCertificateById(certificateId: string) {
  const result = await backendFetch<BackendResponse<LedgerCertificate>>(
    `/api/certificates/${encodeURIComponent(certificateId)}`
  )

  if (!result.data) {
    throw new Error("Data sertifikat tidak ditemukan di backend.")
  }

  return result.data
}

async function getDatabaseCertificates(issuerId?: string) {
  const query = issuerId ? `?issuerId=${encodeURIComponent(issuerId)}` : ""
  const result = await backendFetch<BackendResponse<DatabaseCertificate[]>>(
    `/api/${query}`
  )

  return result.data ?? []
}

async function getDatabaseCertificateByCertificateId(
  certificateId: string,
  issuerId?: string
) {
  const certificates = await getDatabaseCertificates(issuerId).catch(() => [])

  return (
    certificates.find(
      (certificate) => certificate.certificateId === certificateId
    ) ?? null
  )
}

async function getIssuerById(issuerId: string) {
  const result = await backendFetch<BackendResponse<Issuer>>(
    `/api/issuers/${encodeURIComponent(issuerId)}`
  )

  return result.data ?? null
}

async function getRevocationByCertificateId(certificateId: string) {
  try {
    const result = await backendFetch<BackendResponse<Revocation>>(
      `/api/certificates/${encodeURIComponent(certificateId)}/revocation`
    )

    return result.data ?? null
  } catch {
    return null
  }
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatOnlyDate(value?: string | null) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

function isRevoked(status?: string | null) {
  return String(status ?? "").toUpperCase() === "REVOKED"
}

function getCertificateTitle(
  certificate: LedgerCertificate,
  dbCertificate: DatabaseCertificate | null
) {
  return (
    dbCertificate?.degreeTitle ??
    dbCertificate?.title ??
    certificate.degreeTitle ??
    certificate.title ??
    "-"
  )
}

function getOrganizationName(
  issuer: Issuer | null,
  dbCertificate: DatabaseCertificate | null
) {
  return (
    issuer?.organizationName ??
    dbCertificate?.organizationName ??
    dbCertificate?.universityName ??
    "-"
  )
}

function getCertificateStatus(
  certificate: LedgerCertificate,
  dbCertificate: DatabaseCertificate | null
) {
  return certificate.status ?? dbCertificate?.status ?? "-"
}

export default async function AdminDiplomaDetailPage({
  params,
}: AdminDiplomaDetailPageProps) {
  const { id } = await params
  const certificateId = decodeURIComponent(id)

  const session = await requireAdminSession()
  const issuerScope = getIssuerScope(session)

  const [ledgerCertificate, scopedDbCertificate] = await Promise.all([
    getCertificateById(certificateId).catch(() => null),
    getDatabaseCertificateByCertificateId(certificateId, issuerScope),
  ])

  if (!ledgerCertificate && !scopedDbCertificate) {
    notFound()
  }

  const certificate: LedgerCertificate = ledgerCertificate ?? {
    certificateId: scopedDbCertificate!.certificateId,
    certificateNumber: scopedDbCertificate!.certificateNumber,
    issuerId: scopedDbCertificate!.issuerId,
    certificateType: scopedDbCertificate!.certificateType,
    title: scopedDbCertificate!.degreeTitle ?? "-",
    degreeTitle: scopedDbCertificate!.degreeTitle ?? null,
    ipfsCid: scopedDbCertificate!.ipfsCid ?? null,
    status: scopedDbCertificate!.status ?? "-",
    issuedAt: scopedDbCertificate!.issuedAt,
    expiredAt: scopedDbCertificate!.expiredAt,
    createdAt: scopedDbCertificate!.created_at,
    updatedAt: scopedDbCertificate!.updated_at,
    studentIdHash: scopedDbCertificate!.studentIdHash,
  }

  if (issuerScope && certificate.issuerId !== issuerScope) {
    notFound()
  }

  const [issuer, revocation, dbCertificate] = await Promise.all([
    getIssuerById(certificate.issuerId).catch(() => null),
    getRevocationByCertificateId(certificate.certificateId),
    scopedDbCertificate ??
      getDatabaseCertificateByCertificateId(
        certificate.certificateId,
        certificate.issuerId
      ),
  ])

  const status = getCertificateStatus(certificate, dbCertificate)

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8">
          <Link
            href="/admin/ijazah"
            className="text-sm font-semibold text-blue-700 hover:text-blue-600"
          >
            ← Kembali ke Data Ijazah
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
            Detail Ijazah
          </h1>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <DetailItem
              label="Nama Mahasiswa"
              value={dbCertificate?.studentName ?? "-"}
            />

            <DetailItem
              label="NIM / Student ID"
              value={dbCertificate?.studentId ?? "-"}
            />

            <DetailItem
              label="Certificate ID"
              value={certificate.certificateId}
            />

            <DetailItem
              label="Nomor Ijazah"
              value={certificate.certificateNumber}
            />

            <DetailItem
              label="Jenis Ijazah"
              value={certificate.certificateType}
            />

            <DetailItem
              label="Gelar"
              value={getCertificateTitle(certificate, dbCertificate)}
            />

            <DetailItem label="Status" value={status} />

            <DetailItem
              label="Fakultas"
              value={dbCertificate?.faculty ?? "-"}
            />

            <DetailItem
              label="Program Studi"
              value={dbCertificate?.studyProgram ?? "-"}
            />

            <DetailItem
              label="Jenjang Pendidikan"
              value={dbCertificate?.educationLevel ?? "-"}
            />

            <DetailItem
              label="Tanggal Lulus"
              value={formatOnlyDate(dbCertificate?.graduationDate)}
            />

            <DetailItem label="Issuer ID" value={certificate.issuerId} />

            <DetailItem
              label="Universitas"
              value={getOrganizationName(issuer, dbCertificate)}
            />

            <DetailItem
              label="Departemen"
              value={issuer?.departmentName ?? "-"}
            />

            <DetailItem label="MSP ID" value={issuer?.mspId ?? "-"} />

            <DetailItem
              label="IPFS CID"
              value={certificate.ipfsCid ?? dbCertificate?.ipfsCid ?? "-"}
            />

            <DetailItem
              label="File Ijazah"
              value={dbCertificate?.file_name ?? "-"}
            />

            <DetailItem
              label="Ukuran File"
              value={
                dbCertificate?.file_size
                  ? `${dbCertificate.file_size} bytes`
                  : "-"
              }
            />

            <DetailItem
              label="Tanggal Terbit"
              value={formatOnlyDate(
                dbCertificate?.issuedAt ?? certificate.issuedAt
              )}
            />

            <DetailItem
              label="Dibuat Pada"
              value={formatDate(dbCertificate?.created_at)}
            />

            <DetailItem
              label="Diupdate Pada"
              value={formatDate(
                dbCertificate?.updated_at ?? certificate.updatedAt
              )}
            />

            <DetailItem
              label="Ledger TX ID"
              value={dbCertificate?.ledger_tx_id ?? "-"}
            />

            {certificate.studentIdHash && (
              <DetailItem
                label="Student ID Hash"
                value={certificate.studentIdHash}
              />
            )}
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-red-700">Revoke Ijazah</h2>

            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Gunakan fitur ini jika ijazah perlu dicabut karena kesalahan data,
              pelanggaran, atau alasan administratif lain.
            </p>
          </div>

          {isRevoked(status) ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-bold">Ijazah ini sudah dicabut.</p>

              <p className="mt-2">
                Revoked At: {formatDate(revocation?.revokedAt)}
              </p>

              <p className="mt-1 break-all font-mono text-xs">
                Reason Hash: {revocation?.reasonHash ?? "-"}
              </p>
            </div>
          ) : (
            // <form
        
            <RevokeDiplomaForm certificateId={certificate.certificateId} />
          )}
        </section>
      </main>

      <Footer />
    </AdminShell>
  )
}

function DetailItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-all text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  )
}