"use client"

import type QrScanner from "qr-scanner"
import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowSquareOut,
  MagnifyingGlass,
  QrCode,
  Scan,
  ShieldCheck,
  WarningCircle,
  X,
} from "@phosphor-icons/react"
import {
  Banner,
  BannerAction,
  BannerClose,
  BannerIcon,
  BannerTitle,
} from "@/components/ui/banner"
import Footer from "@/components/ui/footer"
import PublicShell from "@/components/ui/public-shell"

type VerificationMethod = "input" | "qr"

type Diploma = {
  id?: string | number | null

  certificateId?: string | null
  certificateNumber?: string | null
  diplomaNumber?: string | null
  certificateType?: string | null

  degreeTitle?: string | null
  title?: string | null

  studentId?: string | null
  studentName?: string | null
  nim?: string | null

  organizationName?: string | null
  universityName?: string | null
  faculty?: string | null

  studyProgram?: string | null
  educationLevel?: string | null
  graduationDate?: string | null

  issuerId?: string | null
  issuer?: {
    issuerId?: string | null
    organizationName?: string | null
    departmentName?: string | null
    mspId?: string | null
    status?: string | null
  } | null

  ipfsCid?: string | null
  documentUrl?: string | null
  documentStatus?: string | null
  documentError?: string | null
  integrityStatus?: string | null
  message?: string | null
  valid?: boolean | null

  ledgerTxId?: string | null
  ledger_tx_id?: string | null

  uploadedFileName?: string | null
  file_name?: string | null
  uploadedFileMimeType?: string | null
  mime_type?: string | null
  uploadedFileSize?: number | null
  file_size?: number | null

  status?: string | null
  issuedAt?: string | null
  expiredAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  studentIdHash?: string | null
  documentHash?: string | null
  fileHash?: string | null
  blockchainTxHash?: string | null
  graduationYear?: number | null

  ledgerData?: {
    certificateId?: string
    valid?: boolean
    status?: string
    issuerId?: string
    certificateType?: string
    message?: string
    issuedAt?: string
    revoked?: boolean
    tampered?: boolean
  } | null
}

type SearchApiResponse = {
  success?: boolean
  found?: boolean
  valid?: boolean
  message?: string
  status?: string | null
  integrityStatus?: string | null
  documentStatus?: string | null
  documentUrl?: string | null
  documentError?: string | null
  data?: Diploma | Diploma[] | null
}

type IntegrityBannerVariant = "green" | "red" | "yellow" | "blue" | "neutral"

type IntegrityBanner = {
  title: string
  description?: string
  variant: IntegrityBannerVariant
}

function formatDisplayDate(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
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

function extractQrValue(value: string) {
  const trimmedValue = value.trim()

  try {
    const url = new URL(trimmedValue)

    const number =
      url.searchParams.get("number") ??
      url.searchParams.get("certificateNumber") ??
      url.searchParams.get("q")

    if (number) {
      return number.trim()
    }

    const pathParts = url.pathname.split("/").filter(Boolean)

    if (
      pathParts[0] === "ijazah" &&
      pathParts[1] &&
      pathParts[1] !== "verifikasi"
    ) {
      return decodeURIComponent(pathParts[1]).trim()
    }
  } catch {
    // QR bukan URL absolut.
  }

  const verificationMatch = trimmedValue.match(
    /[?&](number|certificateNumber|q)=([^&]+)/
  )

  if (verificationMatch?.[2]) {
    return decodeURIComponent(verificationMatch[2]).trim()
  }

  const routeMatch = trimmedValue.match(/\/ijazah\/([^/?#]+)/)

  if (routeMatch?.[1] && routeMatch[1] !== "verifikasi") {
    return decodeURIComponent(routeMatch[1]).trim()
  }

  return trimmedValue
}

function getFirstDiploma(data: Diploma | Diploma[] | null | undefined) {
  if (Array.isArray(data)) {
    return data[0] ?? null
  }

  return data ?? null
}

function getCertificateNumber(diploma: Diploma) {
  return diploma.certificateNumber ?? diploma.diplomaNumber ?? "-"
}

function getStudentId(diploma: Diploma) {
  return diploma.studentId ?? diploma.nim ?? null
}

function getCertificateTitle(diploma: Diploma) {
  return diploma.degreeTitle ?? diploma.title ?? null
}

function getIssuerName(diploma: Diploma) {
  return (
    diploma.issuer?.organizationName ??
    diploma.organizationName ??
    diploma.universityName ??
    null
  )
}


function getIpfsGatewayUrl() {
  const gatewayUrl = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ?? ""

  return gatewayUrl.replace(/\/$/, "")
}

function normalizeStatus(value?: string | null) {
  return value?.trim().toUpperCase() ?? ""
}

function formatApiMessage(message?: string | null) {
  const normalizedMessage = message?.trim().toLowerCase() ?? ""

  if (!normalizedMessage) {
    return ""
  }

  if (normalizedMessage.includes("certificate is valid")) {
    // return "Data ijazah valid dan telah diverifikasi."
    return "Certificate data is valid and has been verified."
  }

  if (normalizedMessage.includes("certificate has been revoked")) {
    // return "Ijazah telah dicabut."
    return "Certificate has been revoked.";
  }

  if (
    normalizedMessage.includes("certificate not found") ||
    normalizedMessage.includes("not found in database or ledger")
  ) {
    // return "Data ijazah tidak ditemukan."
    return "Certificate not found.";
  }

  if (
    normalizedMessage.includes("possible manipulation") ||
    normalizedMessage.includes("illegal data")
  ) {
    // return "Terdapat indikasi manipulasi data."
    return "Data manipulation detected.";
  }

  if (normalizedMessage.includes("document file not found")) {
    // return "File ijazah tidak ditemukan."
    return "Document file not found.";
  }

  return message ?? ""
}

function isRevoked(diploma: Diploma) {
  return (
    diploma.ledgerData?.revoked === true ||
    normalizeStatus(diploma.ledgerData?.status) === "REVOKED" ||
    normalizeStatus(diploma.status) === "REVOKED"
  )
}

function getIntegrityBanner(diploma?: Diploma | null): IntegrityBanner | null {
  if (!diploma) {
    return null
  }

  const integrityStatus = normalizeStatus(diploma.integrityStatus)
  const documentStatus = normalizeStatus(diploma.documentStatus)
  if (integrityStatus === "DB_LEDGER_MISMATCH") {
    return {
      // title: "Indikasi Manipulasi Data",
      title: "Data Manipulation Indicated",
      variant: "red",
    }
  }

  if (integrityStatus === "LEDGER_RECOVERED") {
    return {
      // title: "Data Disinkronkan Ulang",
      title: "Data Resynchronized",
      variant: "blue",
    }
  }

  if (documentStatus === "FILE_NOT_FOUND") {
    return {
      // title: "File Ijazah Tidak Ditemukan",
      title: "Certificate File Not Found",
      variant: "yellow",
    }
  }

  return null
}

function canViewDocument(diploma: Diploma) {
  return (
    normalizeStatus(diploma.documentStatus) !== "FILE_NOT_FOUND" &&
    normalizeStatus(diploma.integrityStatus) !== "DB_LEDGER_MISMATCH" &&
    !isRevoked(diploma)
  )
}

function normalizeDocumentUrl(
  documentUrl?: string | null,
  ipfsCid?: string | null
) {
  const rawUrl = documentUrl?.trim()

  if (rawUrl) {
    try {
      const url = new URL(rawUrl)

      if (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "::1"
      ) {
        const gatewayUrl = getIpfsGatewayUrl()

        if (!gatewayUrl) {
          return null
        }

        return `${gatewayUrl}${url.pathname}`
      }

      return url.toString()
    } catch {
      return null
    }
  }

  if (!ipfsCid) {
    return null
  }

  const gatewayUrl = getIpfsGatewayUrl()

  if (!gatewayUrl) {
    return null
  }

  return `${gatewayUrl}/ipfs/${encodeURIComponent(ipfsCid)}`
}

function getIpfsDocumentUrl(diploma: Diploma) {
  if (!canViewDocument(diploma)) {
    return null
  }

  return normalizeDocumentUrl(diploma.documentUrl, diploma.ipfsCid)
}

function getSummaryStatus(diploma: Diploma) {
  if (normalizeStatus(diploma.integrityStatus) === "DB_LEDGER_MISMATCH") {
    return "ACTIVE"
  }

  return diploma.ledgerData?.status || diploma.status || "Belum tersedia"
}

function getVerificationWatermark(diploma: Diploma) {
  if (normalizeStatus(diploma.integrityStatus) === "LEDGER_RECOVERED") {
    return null
  }

  if (isRevoked(diploma)) {
    return {
      // label: "Ijazah Telah Dicabut",
      label: "Certificate Has Been Revoked",
      className: "border-red-200 bg-red-50 text-red-700",
    }
  }

  const status = normalizeStatus(diploma.ledgerData?.status ?? diploma.status)

  if (diploma.valid === true || diploma.ledgerData?.valid === true || status === "VALID" || status === "ACTIVE") {
    return {
      // label: "Terverifikasi",
      label: "Verified",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    }
  }

  return null
}

function VerificationIntegrityBanner({
  banner,
  documentUrl,
  onClose,
}: {
  banner: IntegrityBanner
  documentUrl?: string | null
  onClose: () => void
}) {
  const className = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-red-200 bg-red-50 text-red-800",
    yellow: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    neutral: "border-slate-200 bg-slate-50 text-slate-800",
  }[banner.variant]

  const iconClassName = {
    green: "text-emerald-600",
    red: "text-red-600",
    yellow: "text-amber-600",
    blue: "text-blue-600",
    neutral: "text-slate-500",
  }[banner.variant]

  const Icon =
    banner.variant === "green" || banner.variant === "blue"
      ? ShieldCheck
      : WarningCircle

  return (
    <Banner className={className}>
      <BannerIcon className={iconClassName}>
        <Icon weight="fill" className="h-5 w-5" />
      </BannerIcon>

      <div className="min-w-0 flex-1">
        <BannerTitle>{banner.title}</BannerTitle>
        {banner.description && (
          <p className="mt-1 text-sm opacity-90">{banner.description}</p>
        )}

        {documentUrl && (
          <BannerAction>
            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              <ArrowSquareOut className="h-4 w-4" />
              Lihat Ijazah
            </a>
          </BannerAction>
        )}
      </div>

      <BannerClose onClick={onClose} aria-label="Dismiss">
        <X className="h-4 w-4" />
      </BannerClose>
    </Banner>
  )
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string
  value?: string | number | null
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <span
        className={`text-sm font-medium text-slate-900 ${mono ? "break-all font-mono text-xs" : ""
          }`}
      >
        {/* {value || "Belum tersedia"} */}
        {value || "Not available"}
      </span>
    </div>
  )
}

function VerificationResultSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-6">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="mt-6 h-11 w-36 animate-pulse rounded-lg bg-slate-200" />
    </div>
  )
}

export default function VerificationClient() {
  const [activeMethod, setActiveMethod] = useState<VerificationMethod>("input")
  const [query, setQuery] = useState("")
  const [diploma, setDiploma] = useState<Diploma | null>(null)
  const [message, setMessage] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isBannerVisible, setIsBannerVisible] = useState(false)

  const searchParams = useSearchParams()
  const numberFromUrl =
    searchParams.get("number")?.trim() ??
    searchParams.get("certificateNumber")?.trim() ??
    searchParams.get("q")?.trim() ??
    ""

  const lastAutoSearchRef = useRef("")
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const resultSectionRef = useRef<HTMLElement | null>(null)

  const integrityBanner = hasSearched && !isSearching && diploma
    ? getIntegrityBanner(diploma)
    : null
  const ipfsDocumentUrl = diploma ? getIpfsDocumentUrl(diploma) : null

  const verificationWatermark = diploma ? getVerificationWatermark(diploma) : null

  useEffect(() => {
    if (!hasSearched || isSearching) return

    requestAnimationFrame(() => {
      resultSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })
  }, [hasSearched, isSearching, diploma, message])

  useEffect(() => {
    if (!numberFromUrl) return
    if (lastAutoSearchRef.current === numberFromUrl) return

    lastAutoSearchRef.current = numberFromUrl
    setActiveMethod("input")
    setQuery(numberFromUrl)
    void searchDiploma(numberFromUrl)
  }, [numberFromUrl])

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop()
        scannerRef.current.destroy()
      }
    }
  }, [])

  async function searchDiploma(searchValue?: string) {
    const finalQuery = (searchValue ?? query).trim()

    if (!finalQuery) {
      setHasSearched(false)
      setIsBannerVisible(false)
      // setMessage("Masukkan nomor ijazah terlebih dahulu.")
      setMessage("Enter certificate number first")
      setDiploma(null)
      return
    }

    setHasSearched(true)
    setIsSearching(true)
    setMessage("")
    setDiploma(null)
    setIsBannerVisible(false)

    try {
      const response = await fetch(
        `/api/ijazah/search?q=${encodeURIComponent(finalQuery)}`
      )

      const result = (await response.json()) as SearchApiResponse

      if (!response.ok || result.success === false) {
        setMessage(
          formatApiMessage(result.message) ||
          // "Terjadi kesalahan saat mencari data."
          "An error occurred while searching for the data."
        )
        setDiploma(null)
        setIsBannerVisible(false)
        return
      }

      const foundDiploma = getFirstDiploma(result.data)

      if (!foundDiploma || result.found === false) {
        setMessage(
          formatApiMessage(result.message) ||
          // "Data ijazah tidak ditemukan."
          "No certificate data found."
        )
        setDiploma(null)
        setIsBannerVisible(false)
        return
      }

      setDiploma({
        ...foundDiploma,
        message: foundDiploma.message ?? result.message ?? null,
        documentStatus: foundDiploma.documentStatus ?? result.documentStatus ?? null,
        documentUrl: foundDiploma.documentUrl ?? result.documentUrl ?? null,
        integrityStatus: foundDiploma.integrityStatus ?? result.integrityStatus ?? null,
        valid: foundDiploma.valid ?? result.valid ?? null,
        status: foundDiploma.status ?? result.status ?? null,
      })
      setMessage(formatApiMessage(result.message))
      setIsBannerVisible(true)
    } catch {
      // setMessage("Gagal menghubungi server.")
      setMessage("Failed to connect to server.")
      setDiploma(null)
      setIsBannerVisible(false)
    } finally {
      setIsSearching(false)
    }
  }

  async function startCameraScanner() {
    if (!videoRef.current) return

    try {
      const QrScannerModule = await import("qr-scanner")

      scannerRef.current = new QrScannerModule.default(
        videoRef.current,
        async (result) => {
          const qrText = typeof result === "string" ? result : result.data
          const extractedValue = extractQrValue(qrText)

          setQuery(extractedValue)
          await stopCameraScanner()
          await searchDiploma(extractedValue)
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      )

      await scannerRef.current.start()
      setIsCameraActive(true)
      setMessage("")
    } catch {
      // setMessage("Kamera gagal dibuka. Pastikan izin kamera sudah diberikan.")
      setMessage("Camera failed to open. Please ensure camera permission is granted.")
      setIsCameraActive(false)
    }
  }

  async function stopCameraScanner() {
    if (scannerRef.current) {
      scannerRef.current.stop()
      scannerRef.current.destroy()
      scannerRef.current = null
    }

    setIsCameraActive(false)
  }

  function handleTabChange(method: VerificationMethod) {
    setActiveMethod(method)
    setMessage("")
  }

  return (
    <PublicShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-6 py-16">
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
            <ShieldCheck weight="fill" className="h-4 w-4" />
            Secure Verification Portal
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
            {/* Verifikasi Ijazah */}
            Certificate Verification
          </h1>

          <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
            {/* Masukkan nomor ijazah atau scan QR Code untuk mengecek keaslian data
            ijazah. */}
            Enter the certificate number or scan the QR Code to check the authenticity of the certificate data.
          </p>
        </section>

        <section className="mx-auto w-full max-w-2xl">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => handleTabChange("input")}
                className={`flex flex-1 items-center justify-center gap-2 px-3 py-4 text-sm font-semibold transition ${activeMethod === "input"
                  ? "border-b-2 border-blue-700 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-blue-700"
                  }`}
              >
                <MagnifyingGlass className="h-5 w-5" />
                {/* Search Manual */}
                
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("qr")}
                className={`flex flex-1 items-center justify-center gap-2 px-3 py-4 text-sm font-semibold transition ${activeMethod === "qr"
                  ? "border-b-2 border-blue-700 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-blue-700"
                  }`}
              >
                <Scan className="h-5 w-5" />
                Scan QR
              </button>
            </div>

            <div className="p-8">
              {activeMethod === "input" && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="query"
                      className="text-sm font-semibold text-slate-600"
                    >
                      {/* Nomor Ijazah / Certificate Number */}
                      Certificate Number
                    </label>

                    <div className="relative">
                      <MagnifyingGlass className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="query"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            void searchDiploma()
                          }
                        }}
                        // placeholder="Contoh: IJZ-2026-001"
                        placeholder="Example: IJZ-2026-001"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                      />

                      <button
                        type="button"
                        onClick={() => handleTabChange("qr")}
                        className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center text-blue-700 transition hover:text-blue-600"
                        title="Scan QR Code"
                      >
                        <QrCode className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeMethod === "qr" && (
                <div className="flex flex-col gap-6">
                  <div className="relative flex aspect-video flex-col items-center justify-center gap-4 overflow-hidden rounded-xl bg-slate-950">
                    <video
                      ref={videoRef}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />

                    {!isCameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950">
                        <Scan className="h-14 w-14 animate-pulse text-white" />
                        <p className="text-sm font-medium text-white">
                          {/* Kamera belum aktif */}
                          Camera is not active
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-center text-xs text-slate-500">
                    {/* Arahkan QR Code pada ijazah ke kamera untuk verifikasi
                    otomatis. */}
                    Point the QR Code on the certificate to the camera for automatic verification.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={startCameraScanner}
                      disabled={isCameraActive}
                      className="rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {/* Mulai Scan */}
                      Start Scan
                    </button>

                    <button
                      type="button"
                      onClick={stopCameraScanner}
                      disabled={!isCameraActive}
                      className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {/* Stop Kamera */}
                      Stop Camera
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => searchDiploma()}
                disabled={isSearching}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShieldCheck weight="fill" className="h-5 w-5" />
                {/* {isSearching ? "Memverifikasi..." : "Verifikasi Dokumen"} */}
                {isSearching ? "Verifying..." : "Verify Document"}
              </button>

            </div>
          </div>
        </section>

        {hasSearched && (
          <section
            ref={resultSectionRef}
            className="mx-auto w-full max-w-3xl scroll-mt-24 border-t border-slate-200 pt-10"
          >
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold text-slate-950">
                {/* Hasil Verifikasi */}
                Verification Results
              </h2>

              {!isSearching && verificationWatermark && (
                <div
                  className={"inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold " + verificationWatermark.className}
                >
                  <ShieldCheck weight="fill" className="h-4 w-4" />
                  {verificationWatermark.label}
                </div>
              )}
            </div>

            {!isSearching && integrityBanner && isBannerVisible && (
              <div className="mb-6">
                <VerificationIntegrityBanner
                  banner={integrityBanner}
                  documentUrl={ipfsDocumentUrl}
                  onClose={() => setIsBannerVisible(false)}
                />
              </div>
            )}

            {isSearching && <VerificationResultSkeleton />}

            {!isSearching && !diploma && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <WarningCircle className="h-8 w-8" />
                </div>

                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  {/* Data Tidak Ditemukan */}
                  Data Not Found
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                  {/* Pastikan nomor ijazah yang dimasukkan sudah benar. */}
                  Ensure the certificate number entered is correct.
                </p>
              </div>
            )}

            {!isSearching && diploma && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
                <section className="overflow-hidden border border-slate-200">
                  <DataRow
                    // label="Status Verifikasi"
                    label="Verification Status"
                    value={getSummaryStatus(diploma)}
                  />

                  <DataRow
                    // label="No Ijazah Nasional"
                    label="Cetificate Number"
                    value={diploma.certificateNumber}
                  />

                  {/* <DataRow label="Nama" value={diploma.studentName} /> */}
                  <DataRow label="Name" value={diploma.studentName} />

                  <DataRow label="NIM" value={getStudentId(diploma)} />

                  <DataRow
                    // label="Tanggal Lulus"
                    label="Graduation Date"
                    value={formatDisplayDate(diploma.graduationDate)}
                  />

                  {/* <DataRow label="Fakultas" value={diploma.faculty ?? "-"} /> */}
                  <DataRow label="Faculty" value={diploma.faculty ?? "-"} />

                  {/* <DataRow label="Prodi" value={diploma.studyProgram} /> */}
                  <DataRow label="Study Program" value={diploma.studyProgram} />

                  <DataRow
                    // label="Jenis Ijazah"
                    label="Certificate Type"
                    value={diploma.certificateType}
                  />

                  <DataRow label="Program" value={diploma.educationLevel} />

                  <DataRow
                    // label="Gelar"
                    label="Title"
                    value={getCertificateTitle(diploma)}
                  />

                  <DataRow
                    // label="Tanggal Terbit"
                    label="Issue Date"
                    value={formatDisplayDate(diploma.issuedAt)}
                  />
                </section>
                {ipfsDocumentUrl && (
                  <a
                    href={ipfsDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    <ArrowSquareOut className="h-5 w-5" />
                    View Certificate
                  </a>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />
    </PublicShell>
  )
}