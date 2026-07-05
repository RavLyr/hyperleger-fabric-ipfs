import Link from "next/link"
import QRCode from "qrcode"
import { notFound } from "next/navigation"
import AdminShell from "@/components/ui/admin-shell"
import { getIssuerScope, requireAdminSession } from "@/lib/auth/session"
import Footer from "@/components/ui/footer"
import {
  ArrowSquareOut,
  CheckCircle,
  DownloadSimple,
  GraduationCap,
  QrCode,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr"
import {
  getDatabaseCertificates,
  getIssuerById,
  getLedgerCertificateDetail,
} from "@/lib/backend-api/certificates"
import type {
  DatabaseCertificate,
  IssuerData,
  LedgerCertificateAsset,
} from "@/lib/backend-api/types"

type PreviewDiplomaPageProps = {
  params: Promise<{
    id: string
  }>
}

export const dynamic = "force-dynamic"
export const revalidate = 0

function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return "-"
  }

  const parsedDate = date instanceof Date ? date : new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate)
}

function formatOnlyDate(date: Date | string | null | undefined) {
  if (!date) {
    return "-"
  }

  const parsedDate = date instanceof Date ? date : new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsedDate)
}

function formatFileSize(size: number | null | undefined) {
  if (!size) {
    return "-"
  }

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

function getCertificateTitle(
  dbCertificate: DatabaseCertificate | null,
  ledgerCertificate: LedgerCertificateAsset
) {
  return (
    dbCertificate?.degreeTitle ??
    dbCertificate?.title ??
    ledgerCertificate.degreeTitle ??
    ledgerCertificate.title ??
    "-"
  )
}

function getOrganizationName(
  issuer: IssuerData | null,
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
  dbCertificate: DatabaseCertificate | null,
  ledgerCertificate: LedgerCertificateAsset
) {
  return ledgerCertificate.status ?? dbCertificate?.status ?? "-"
}

function getIpfsGatewayUrl() {
  const gatewayUrl =
    process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ??
    process.env.IPFS_GATEWAY_URL ??
    ""

  return gatewayUrl.replace(/\/$/, "")
}

function getIpfsDocumentUrl(ipfsCid?: string | null) {
  if (!ipfsCid) {
    return null
  }

  const gatewayUrl = getIpfsGatewayUrl()

  if (!gatewayUrl) {
    return null
  }

  return `${gatewayUrl}/ipfs/${encodeURIComponent(ipfsCid)}`
}

function MetadataItem({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 break-words text-sm font-semibold text-slate-900 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  )
}

async function getDatabaseCertificateByCertificateId(
  certificateId: string,
  issuerId: string
) {
  const certificates = await getDatabaseCertificates(issuerId).catch(() => [])

  return (
    certificates.find(
      (certificate) => certificate.certificateId === certificateId
    ) ?? null
  )
}

async function getSafeIssuer(issuerId: string): Promise<IssuerData | null> {
  return getIssuerById(issuerId).catch(() => null)
}

export default async function PreviewDiplomaPage({
  params,
}: PreviewDiplomaPageProps) {
  const { id } = await params
  const certificateId = decodeURIComponent(id)

  const session = await requireAdminSession()
  const issuerScope = getIssuerScope(session)

  const ledgerCertificate = await getLedgerCertificateDetail(
    certificateId
  ).catch(() => null)

  if (!ledgerCertificate) {
    notFound()
  }

  if (issuerScope && ledgerCertificate.issuerId !== issuerScope) {
    notFound()
  }

  const [dbCertificate, issuer] = await Promise.all([
    getDatabaseCertificateByCertificateId(
      ledgerCertificate.certificateId,
      ledgerCertificate.issuerId
    ),
    getSafeIssuer(ledgerCertificate.issuerId),
  ])

  const certificateNumber =
    dbCertificate?.certificateNumber ?? ledgerCertificate.certificateNumber

  const studentName = dbCertificate?.studentName ?? "-"
  const studentId = dbCertificate?.studentId ?? "-"
  const studyProgram = dbCertificate?.studyProgram ?? "-"
  const educationLevel = dbCertificate?.educationLevel ?? "-"
  const graduationDate = dbCertificate?.graduationDate ?? null

  const certificateType =
    dbCertificate?.certificateType ?? ledgerCertificate.certificateType ?? "IJAZAH"

  const certificateTitle = getCertificateTitle(
    dbCertificate,
    ledgerCertificate
  )

  const status = getCertificateStatus(dbCertificate, ledgerCertificate)

  const issuedAt = dbCertificate?.issuedAt ?? ledgerCertificate.issuedAt
  const expiredAt = dbCertificate?.expiredAt ?? ledgerCertificate.expiredAt
  const ipfsCid = dbCertificate?.ipfsCid ?? ledgerCertificate.ipfsCid
  const documentUrl = getIpfsDocumentUrl(ipfsCid)

  const organizationName = getOrganizationName(issuer, dbCertificate)

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "")

  const verificationUrl = `${appUrl}/ijazah/${encodeURIComponent(
    certificateNumber
  )}/qr`

  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 320,
  })

  return (
    <AdminShell>
      <main className="relative flex min-h-[calc(100dvh-80px)] w-full flex-grow items-center justify-center overflow-hidden px-6 py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle, #e0e3e5 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <section className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0px_10px_30px_-5px_rgba(0,81,213,0.08)]">
          <div className="p-8 text-center md:p-12">
            <div className="mb-8 flex flex-col items-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <CheckCircle weight="fill" className="h-14 w-14" />
              </div>

              <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Submission Successful
              </h1>

              <p className="text-sm text-slate-600">
                QR code verifikasi ijazah berhasil dibuat.
              </p>
            </div>

            <div className="relative mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left md:p-8">
              <div className="pointer-events-none absolute right-4 top-4 opacity-10">
                <GraduationCap
                  weight="fill"
                  className="h-20 w-20 text-slate-900"
                />
              </div>

              <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
                <div className="flex h-48 w-48 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <img
                    src={qrCodeDataUrl}
                    alt={`QR Code ${certificateNumber}`}
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="w-full flex-grow space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Nama Mahasiswa
                    </span>

                    <p className="mt-1 text-xl font-bold text-slate-950">
                      {studentName}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <MetadataItem label="NIM" value={studentId} />

                    <MetadataItem
                      label="Nomor Ijazah"
                      value={certificateNumber}
                      mono
                    />

                    <MetadataItem
                      label="Program Studi"
                      value={studyProgram}
                    />

                    <MetadataItem
                      label="Jenjang Pendidikan"
                      value={educationLevel}
                    />

                    <MetadataItem
                      label="Tanggal Lulus"
                      value={formatOnlyDate(graduationDate)}
                    />

                    <MetadataItem label="Status" value={status} />
                  </div>

                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      <ShieldCheck weight="fill" className="h-4 w-4" />
                      QR READY
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                  Metadata Sertifikat Digital
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <MetadataItem
                    label="Certificate ID"
                    value={ledgerCertificate.certificateId}
                    mono
                  />

                  <MetadataItem
                    label="Certificate Number"
                    value={certificateNumber}
                    mono
                  />

                  <MetadataItem
                    label="Certificate Type"
                    value={certificateType}
                  />

                  <MetadataItem label="Degree Title" value={certificateTitle} />

                  <MetadataItem label="Status" value={status} />

                  <MetadataItem
                    label="Issuer ID"
                    value={ledgerCertificate.issuerId}
                    mono
                  />

                  <MetadataItem label="Issuer" value={organizationName} />

                  <MetadataItem
                    label="Department"
                    value={issuer?.departmentName ?? "-"}
                  />

                  <MetadataItem
                    label="MSP ID"
                    value={issuer?.mspId ?? "-"}
                    mono
                  />

                  <MetadataItem
                    label="Issued At"
                    value={formatOnlyDate(issuedAt)}
                  />

                  <MetadataItem
                    label="Expired At"
                    value={formatOnlyDate(expiredAt)}
                  />

                  <MetadataItem
                    label="Graduation Date"
                    value={formatOnlyDate(graduationDate)}
                  />

                  <MetadataItem label="IPFS CID" value={ipfsCid ?? "-"} mono />

                  {ledgerCertificate.studentIdHash ? (
                    <MetadataItem
                      label="Student ID Hash"
                      value={ledgerCertificate.studentIdHash}
                      mono
                    />
                  ) : null}

                  <MetadataItem
                    label="File"
                    value={dbCertificate?.file_name ?? "-"}
                  />

                  <MetadataItem
                    label="File MIME Type"
                    value={dbCertificate?.mime_type ?? "-"}
                  />

                  <MetadataItem
                    label="File Size"
                    value={formatFileSize(dbCertificate?.file_size)}
                  />

                  <MetadataItem
                    label="Ledger TX ID"
                    value={dbCertificate?.ledger_tx_id ?? "-"}
                    mono
                  />
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Verification URL
                </p>

                <p className="mt-2 break-all font-mono text-xs text-blue-900">
                  {verificationUrl}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-4 sm:flex-row sm:flex-wrap">
              <a
                href={qrCodeDataUrl}
                download={`qr-${certificateNumber}.png`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-8 py-4 text-sm font-bold text-white transition hover:bg-blue-600 hover:shadow-lg active:scale-95"
              >
                <DownloadSimple className="h-5 w-5" />
                Unduh QR Code
              </a>

              <Link
                href="/admin/ijazah"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-8 py-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50 active:scale-95"
              >
                <QrCode className="h-5 w-5" />
                Kembali ke Dashboard
              </Link>

              <Link
                href={`/admin/ijazah/${encodeURIComponent(
                  ledgerCertificate.certificateId
                )}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-8 py-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50 active:scale-95"
              >
                <ArrowSquareOut className="h-5 w-5" />
                Lihat Detail
              </Link>

              {documentUrl && (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-8 py-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50 active:scale-95"
                >
                  <ArrowSquareOut className="h-5 w-5" />
                  Buka PDF
                </a>
              )}
            </div>

            <p className="mt-8 text-xs font-semibold text-slate-500">
              Generated on:{" "}
              {formatDate(
                dbCertificate?.created_at ?? ledgerCertificate.createdAt
              )}{" "}
              • Certificate Number:{" "}
              <span className="font-mono">{certificateNumber}</span>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </AdminShell>
  )
}