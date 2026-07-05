"use client"

import type QrScanner from "qr-scanner"
import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowSquareOut,
  FileArrowUp,
  MagnifyingGlass,
  QrCode,
  Scan,
  ShieldCheck,
  UserCircle,
  WarningCircle,
} from "@phosphor-icons/react"
import Footer from "@/components/ui/footer"
import PublicShell from "@/components/ui/public-shell"

type VerificationMethod = "input" | "qr"

type CertificateStatus =
  | "VALID"
  | "ACTIVE"
  | "REVOKED"
  | "REISSUED"
  | "EXPIRED"
  | "UNKNOWN"

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

  ledgerTxId?: string | null
  ledger_tx_id?: string | null

  uploadedFileName?: string | null
  file_name?: string | null
  uploadedFileMimeType?: string | null
  mime_type?: string | null
  uploadedFileSize?: number | null
  file_size?: number | null

  status?: CertificateStatus | string | null
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
  data?: Diploma | Diploma[] | null
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

function formatFileSize(value?: number | null) {
  if (!value) {
    return null
  }

  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
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

function normalizeStatus(status?: string | null): CertificateStatus {
  const upperStatus = String(status ?? "").toUpperCase()

  if (upperStatus === "VALID") return "VALID"
  if (upperStatus === "ACTIVE") return "ACTIVE"
  if (upperStatus === "REVOKED") return "REVOKED"
  if (upperStatus === "REISSUED") return "REISSUED"
  if (upperStatus === "EXPIRED") return "EXPIRED"

  return "UNKNOWN"
}

function getFinalStatus(diploma: Diploma) {
  return diploma.ledgerData?.status ?? diploma.status ?? "UNKNOWN"
}

function getStatusLabel(status?: string | null) {
  const normalizedStatus = normalizeStatus(status)

  if (normalizedStatus === "VALID" || normalizedStatus === "ACTIVE") {
    return "Terverifikasi"
  }

  if (normalizedStatus === "REVOKED") {
    return "Dicabut"
  }

  if (normalizedStatus === "REISSUED") {
    return "Diterbitkan Ulang"
  }

  if (normalizedStatus === "EXPIRED") {
    return "Kedaluwarsa"
  }

  return "Status Tidak Diketahui"
}

function getStatusClassName(status?: string | null) {
  const normalizedStatus = normalizeStatus(status)

  if (normalizedStatus === "VALID" || normalizedStatus === "ACTIVE") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }

  if (normalizedStatus === "REVOKED") {
    return "bg-red-50 text-red-700 border-red-200"
  }

  if (normalizedStatus === "REISSUED" || normalizedStatus === "EXPIRED") {
    return "bg-yellow-50 text-yellow-700 border-yellow-200"
  }

  return "bg-slate-50 text-slate-700 border-slate-200"
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

function getDepartmentName(diploma: Diploma) {
  return diploma.issuer?.departmentName ?? null
}

function getIpfsGatewayUrl() {
  const gatewayUrl = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ?? ""

  return gatewayUrl.replace(/\/$/, "")
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
  return normalizeDocumentUrl(diploma.documentUrl, diploma.ipfsCid)
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
        className={`text-sm font-medium text-slate-900 ${
          mono ? "break-all font-mono text-xs" : ""
        }`}
      >
        {value || "Belum tersedia"}
      </span>
    </div>
  )
}

function VerificationResultSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-4 text-center">
            <div className="h-24 w-24 animate-pulse rounded-full bg-slate-200" />

            <div className="w-full space-y-3">
              <div className="mx-auto h-5 w-40 animate-pulse rounded bg-slate-200" />
              <div className="mx-auto h-4 w-56 animate-pulse rounded bg-slate-200" />
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:col-span-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
          </div>

          <div className="grid grid-cols-1 gap-x-12 gap-y-6 p-6 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
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

  const finalStatus = diploma ? getFinalStatus(diploma) : "UNKNOWN"
  const ipfsDocumentUrl = diploma ? getIpfsDocumentUrl(diploma) : null

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
      setMessage("Masukkan nomor ijazah terlebih dahulu.")
      setDiploma(null)
      return
    }

    setHasSearched(true)
    setIsSearching(true)
    setMessage("")
    setDiploma(null)

    try {
      const response = await fetch(
        `/api/ijazah/search?q=${encodeURIComponent(finalQuery)}`
      )

      const result = (await response.json()) as SearchApiResponse

      if (!response.ok || result.success === false) {
        setMessage(result.message || "Terjadi kesalahan saat mencari data.")
        setDiploma(null)
        return
      }

      const foundDiploma = getFirstDiploma(result.data)

      if (!foundDiploma || result.found === false) {
        setMessage(result.message || "Data ijazah tidak ditemukan.")
        setDiploma(null)
        return
      }

      setDiploma(foundDiploma)
      setMessage(result.message ?? "")
    } catch {
      setMessage("Gagal menghubungi server.")
      setDiploma(null)
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
      setMessage("Kamera gagal dibuka. Pastikan izin kamera sudah diberikan.")
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
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-16">
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
            <ShieldCheck weight="fill" className="h-4 w-4" />
            Secure Verification Portal
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
            Verifikasi Ijazah
          </h1>

          <p className="max-w-2xl text-lg leading-relaxed text-slate-600">
            Masukkan nomor ijazah atau scan QR Code untuk mengecek keaslian data
            ijazah.
          </p>
        </section>

        <section className="mx-auto w-full max-w-2xl">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => handleTabChange("input")}
                className={`flex flex-1 items-center justify-center gap-2 px-3 py-4 text-sm font-semibold transition ${
                  activeMethod === "input"
                    ? "border-b-2 border-blue-700 text-blue-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-blue-700"
                }`}
              >
                <MagnifyingGlass className="h-5 w-5" />
                Search Manual
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("qr")}
                className={`flex flex-1 items-center justify-center gap-2 px-3 py-4 text-sm font-semibold transition ${
                  activeMethod === "qr"
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
                      Nomor Ijazah / Certificate Number
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
                        placeholder="Contoh: IJZ-2026-001"
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
                          Kamera belum aktif
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-center text-xs text-slate-500">
                    Arahkan QR Code pada ijazah ke kamera untuk verifikasi
                    otomatis.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={startCameraScanner}
                      disabled={isCameraActive}
                      className="rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mulai Scan
                    </button>

                    <button
                      type="button"
                      onClick={stopCameraScanner}
                      disabled={!isCameraActive}
                      className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Stop Kamera
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
                {isSearching ? "Memverifikasi..." : "Verifikasi Dokumen"}
              </button>

              {message && (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {message}
                </div>
              )}
            </div>
          </div>
        </section>

        {hasSearched && (
          <section
            ref={resultSectionRef}
            className="w-full scroll-mt-24 border-t border-slate-200 pt-10"
          >
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold text-slate-950">
                Hasil Verifikasi
              </h2>

              {!isSearching && diploma && (
                <div
                  className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${getStatusClassName(
                    finalStatus
                  )}`}
                >
                  <ShieldCheck weight="fill" className="h-4 w-4" />
                  {getStatusLabel(finalStatus)}
                </div>
              )}
            </div>

            {isSearching && <VerificationResultSkeleton />}

            {!isSearching && !diploma && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <WarningCircle className="h-8 w-8" />
                </div>

                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  Data Tidak Ditemukan
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                  Pastikan nomor ijazah yang dimasukkan sudah benar.
                </p>
              </div>
            )}

            {!isSearching && diploma && (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
                    <div className="mb-6 flex flex-col items-center gap-4 text-center">
                      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-blue-100 bg-slate-100 text-slate-400">
                        <UserCircle className="h-20 w-20" />
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-slate-950">
                          {diploma.studentName || "Pemilik Ijazah"}
                        </h3>

                        <p className="text-sm font-semibold text-blue-700">
                          Certificate: {getCertificateNumber(diploma)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-200 pt-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Status
                        </span>
                        <span className="text-right text-sm font-medium text-slate-900">
                          {getStatusLabel(finalStatus)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Jenis Ijazah
                        </span>
                        <span className="text-right text-sm font-medium text-slate-900">
                          {diploma.certificateType || "IJAZAH"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Tanggal Terbit
                        </span>
                        <span className="text-right text-sm font-medium text-slate-900">
                          {formatDisplayDate(diploma.issuedAt) ||
                            "Belum tersedia"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-6 lg:col-span-2">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                      <h3 className="text-sm font-bold text-slate-950">
                        Detail Sertifikat
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-x-12 gap-y-6 p-6 md:grid-cols-2">
                      <DetailItem
                        label="Nama Mahasiswa"
                        value={diploma.studentName}
                      />

                      <DetailItem
                        label="NIM / Student ID"
                        value={getStudentId(diploma)}
                        mono
                      />

                      <DetailItem
                        label="Nomor Ijazah"
                        value={getCertificateNumber(diploma)}
                        mono
                      />

                      <DetailItem
                        label="Universitas"
                        value={getIssuerName(diploma)}
                      />

                      <DetailItem
                        label="Departemen"
                        value={getDepartmentName(diploma)}
                      />

                      <DetailItem
                        label="Program Studi"
                        value={diploma.studyProgram}
                      />

                      <DetailItem
                        label="Jenjang Pendidikan"
                        value={diploma.educationLevel}
                      />

                      <DetailItem
                        label="Tanggal Lulus"
                        value={formatDisplayDate(diploma.graduationDate)}
                      />

                      <DetailItem
                        label="Gelar"
                        value={getCertificateTitle(diploma)}
                      />

                      <DetailItem
                        label="Jenis Ijazah"
                        value={diploma.certificateType}
                      />

                      <DetailItem
                        label="Tanggal Terbit"
                        value={formatDisplayDate(diploma.issuedAt)}
                      />

                      <DetailItem
                        label="Status Ledger"
                        value={diploma.ledgerData?.status ?? finalStatus}
                      />

                      <DetailItem
                        label="File"
                        value={diploma.file_name ?? diploma.uploadedFileName}
                      />

                      <DetailItem
                        label="Ukuran File"
                        value={formatFileSize(
                          diploma.file_size ?? diploma.uploadedFileSize
                        )}
                      />
                    </div>
                  </div>

                  {ipfsDocumentUrl && (
                    <a
                      href={ipfsDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      <ArrowSquareOut className="h-5 w-5" />
                      Buka Dokumen IPFS
                    </a>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />
    </PublicShell>
  )
}