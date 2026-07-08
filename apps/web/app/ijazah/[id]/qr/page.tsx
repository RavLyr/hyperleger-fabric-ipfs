import { notFound } from "next/navigation"
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr"
import { verifyCertificateByNumber } from "@/lib/backend-api/certificates"

type PublicQrCertificatePageProps = {
  params: Promise<{
    id: string
  }>
}

export const dynamic = "force-dynamic"
export const revalidate = 0

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

function formatGeneratedDate() {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date())
}

function normalizeStatus(value?: string | null) {
  return String(value ?? "").toUpperCase()
}

function isVerifiedStatus(value?: string | null) {
  const status = normalizeStatus(value)

  return status === "VALID" || status === "ACTIVE"
}

function getDisplayStatus(value?: string | null) {
  const status = normalizeStatus(value)

  if (status === "ACTIVE") {
    return "VALID"
  }

  return status || "UNKNOWN"
}

function DataRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[42%_58%] border-b border-slate-200 text-[13px] sm:grid-cols-[31%_69%] sm:text-sm">
      <div className="bg-slate-50 px-3 py-2 font-medium uppercase text-slate-700">
        {label}
      </div>

      <div className="bg-white px-3 py-2 font-bold text-slate-800">
        {value || "-"}
      </div>
    </div>
  )
}

export default async function PublicQrCertificatePage({
  params,
}: PublicQrCertificatePageProps) {
  const { id } = await params
  const certificateNumber = decodeURIComponent(id)

  const verification = await verifyCertificateByNumber(certificateNumber).catch(
    () => null
  )

  if (!verification?.success || !verification.dbData) {
    notFound()
  }

  const certificate = verification.dbData
  const ledgerData = verification.ledgerData

  const finalStatus = ledgerData?.status ?? certificate.status
  const isVerified = verification.valid && isVerifiedStatus(finalStatus)

  const organizationName =
    certificate.organizationName ??
    certificate.universityName ??
    "Universitas Diponegoro"

  return (
    <main className="min-h-screen bg-white px-5 py-8 text-slate-900">
      <section className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-5">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {isVerified ? "Verified!" : "Verification Result"}
          </h1>

          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isVerified
                ? "bg-blue-100 text-blue-600"
                : "bg-red-100 text-red-600"
            }`}
          >
            {isVerified ? (
              <CheckCircle weight="fill" className="h-8 w-8" />
            ) : (
              <WarningCircle weight="fill" className="h-8 w-8" />
            )}
          </div>
        </header>

        <section className="mb-6 text-center">
          <h2 className="text-lg font-medium uppercase tracking-wide text-slate-700">
            {organizationName}
          </h2>
        </section>

        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          Penetapan dokumen tersebut melalui beberapa proses, detail dokumen
          antara lain sebagai berikut:
        </p>

        <section className="overflow-hidden border border-slate-200">
          <DataRow
            label="Status Verifikasi"
            value={isVerified ? "VALID" : getDisplayStatus(finalStatus)}
          />

          <DataRow
            label="No Ijazah Nasional"
            value={certificate.certificateNumber}
          />

          <DataRow label="Nama" value={certificate.studentName} />

          <DataRow label="NIM" value={certificate.studentId} />

          <DataRow
            label="Tanggal Lulus"
            value={formatOnlyDate(certificate.graduationDate)}
          />

          <DataRow label="Fakultas" value={certificate.faculty ?? "-"} />

          <DataRow label="Prodi" value={certificate.studyProgram} />

          <DataRow
            label="Jenis Ijazah"
            value={certificate.certificateType || "Ijazah"}
          />

          <DataRow label="Program" value={certificate.educationLevel} />

          <DataRow
            label="Gelar"
            value={certificate.degreeTitle ?? certificate.title}
          />

          <DataRow
            label="Tanggal Terbit"
            value={formatOnlyDate(certificate.issuedAt)}
          />

          <DataRow
            label="Issuer ID"
            value={
              <span className="font-mono text-xs">{certificate.issuerId}</span>
            }
          />
        </section>

        {verification.documentUrl ? (
          <div className="mt-6">
            <a
              href={verification.documentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-600"
            >
              Buka Dokumen Asli
            </a>
          </div>
        ) : null}

        <p className="mt-8 text-sm leading-relaxed text-slate-600">
          Dengan ini menjadikan dokumen tersebut sah dan dapat dipergunakan
          sebagaimana mestinya.
        </p>

        <p className="mt-8 text-xs italic text-slate-500">
          Last Generated: {formatGeneratedDate()}
        </p>
      </section>
    </main>
  )
}