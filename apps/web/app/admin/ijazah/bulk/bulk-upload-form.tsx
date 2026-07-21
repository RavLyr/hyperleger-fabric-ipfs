"use client"

import Link from "next/link"
import { useState, useRef } from "react"
import AdminShell from "@/components/ui/admin-shell"
import Footer from "@/components/ui/footer"
import {
  ArrowLeft,
  FileText,
  UploadSimple,
  Play,
  CheckCircle,
  WarningCircle,
  Folder,
} from "@phosphor-icons/react"
import {
  createBulkJobApi,
  uploadBulkManifestApi,
  requestUploadUrlsApi,
  completeBulkUploadApi,
  startBulkJobProcessingApi,
  getBulkJobStatusApi,
  getBulkJobItemsApi,
} from "@/lib/backend-api/certificates"
import type { AuthSession } from "@/lib/auth/session"
import type {
  BulkUploadJobData,
  BulkUploadItemData,
  ManifestValidationResult,
  UploadPresignedUrlItem,
} from "@/lib/backend-api/types"

type BulkUploadFormProps = {
  session: AuthSession
}

type FileUploadStatus = {
  pdfFileName: string
  status: "pending" | "uploading" | "success" | "failed"
  progress: number
  error?: string
}

export default function BulkUploadForm({ session }: BulkUploadFormProps) {
  const [step, setStep] = useState<"init" | "manifest" | "files" | "process">("init")
  const [job, setJob] = useState<BulkUploadJobData | null>(null)

  // Manifest files
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [validationResult, setValidationResult] = useState<ManifestValidationResult | null>(null)
  const [isUploadingManifest, setIsUploadingManifest] = useState(false)
  const [manifestError, setManifestError] = useState<string | null>(null)

  // PDF files
  const [pdfFiles, setPdfFiles] = useState<File[]>([])
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileUploadStatus>>({})
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [stagedUrls, setStagedUrls] = useState<UploadPresignedUrlItem[]>([])

  // Progress monitoring
  const [jobItems, setJobItems] = useState<BulkUploadItemData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processError, setProcessError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize a new Bulk Job
  async function handleInitJob() {
    try {
      const newJob = await createBulkJobApi()
      setJob(newJob)
      setStep("manifest")
    } catch (err: unknown) {
      setManifestError(err instanceof Error ? err.message : "Gagal menginisiasi bulk upload job")
    }
  }

  // Handle Excel change
  function handleExcelChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setExcelFile(file)
      setManifestError(null)
    }
  }

  // Upload Excel manifest
  async function handleUploadManifest() {
    if (!job || !excelFile) return
    setIsUploadingManifest(true)
    setManifestError(null)
    try {
      const result = await uploadManifestDirect(job.jobId, excelFile)
      setJob(result.job)
      setValidationResult(result.validation)
      if (result.validation.invalidRows.length > 0) {
        setManifestError(`${result.validation.invalidRows.length} baris Excel tidak valid. Silakan perbaiki manifest Excel Anda.`)
      } else {
        setStep("files")
      }
    } catch (err: unknown) {
      setManifestError(err instanceof Error ? err.message : "Gagal mengunggah manifest Excel")
    } finally {
      setIsUploadingManifest(false)
    }
  }

  // Next.js actions wrapper because backendFetch requires server boundary setup if inside standard Next router
  // but backendFetch client-side helper is safe for absolute path client calls.
  async function uploadManifestDirect(jobId: string, file: File) {
    return uploadBulkManifestApi(jobId, file)
  }

  // Handle PDF folder/files change
  function handlePdfFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const fileList = Array.from(files).filter((file) => file.name.endsWith(".pdf"))
    setPdfFiles(fileList)
    setFilesError(null)

    const initialStatuses: Record<string, FileUploadStatus> = {}
    fileList.forEach((file) => {
      initialStatuses[file.name] = {
        pdfFileName: file.name,
        status: "pending",
        progress: 0,
      }
    });
    setFileStatuses(initialStatuses)
  }

  // Request upload URLs and execute files uploads with bounded concurrency
  async function handleUploadFiles() {
    if (!job || pdfFiles.length === 0) return
    setIsUploadingFiles(true)
    setFilesError(null)
    try {
      // 1. Get required list of files to upload from manifest
      const pdfNames = pdfFiles.map((f) => f.name)

      // Request presigned S3 URLs from backend
      const { urls } = await requestUploadUrlsApi(job.jobId, pdfNames)
      setStagedUrls(urls)

      // Map files to staging URLs
      const fileMap = new Map<string, File>()
      pdfFiles.forEach((file) => fileMap.set(file.name, file))

      // Upload with bounded concurrency (e.g. 5 parallel uploads)
      const concurrency = 5
      const uploadQueue = [...urls]
      let activeCount = 0
      let completedCount = 0

      return new Promise<void>((resolve, reject) => {
        async function runNext() {
          if (uploadQueue.length === 0 && activeCount === 0) {
            resolve()
            return
          }

          while (uploadQueue.length > 0 && activeCount < concurrency) {
            const urlItem = uploadQueue.shift()!
            const file = fileMap.get(urlItem.pdfFileName)

            if (!file) {
              setFileStatuses((prev) => ({
                ...prev,
                [urlItem.pdfFileName]: {
                  pdfFileName: urlItem.pdfFileName,
                  status: "failed",
                  progress: 0,
                  error: "Berkas PDF tidak ditemukan dalam antrean unggah",
                },
              }))
              continue
            }

            activeCount++
            setFileStatuses((prev) => ({
              ...prev,
              [urlItem.pdfFileName]: {
                ...prev[urlItem.pdfFileName],
                status: "uploading",
              },
            }))

            uploadFileToPresignedUrl(urlItem.uploadUrl, file, (progress) => {
              setFileStatuses((prev) => ({
                ...prev,
                [urlItem.pdfFileName]: {
                  ...prev[urlItem.pdfFileName],
                  progress,
                },
              }))
            })
              .then(() => {
                setFileStatuses((prev) => ({
                  ...prev,
                  [urlItem.pdfFileName]: {
                    ...prev[urlItem.pdfFileName],
                    status: "success",
                    progress: 100,
                  },
                }))
              })
              .catch((err) => {
                setFileStatuses((prev) => ({
                  ...prev,
                  [urlItem.pdfFileName]: {
                    ...prev[urlItem.pdfFileName],
                    status: "failed",
                    error: err instanceof Error ? err.message : "Gagal mengunggah",
                  },
                }))
              })
              .finally(() => {
                activeCount--
                completedCount++
                runNext()
              })
          }
        }
        runNext()
      })
        .then(async () => {
          // Signal backend that file upload is completed
          const updatedJob = await completeBulkUploadApi(job.jobId)
          setJob(updatedJob)
          setStep("process")
        })
        .catch((err) => {
          setFilesError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah berkas-berkas PDF")
        })
        .finally(() => {
          setIsUploadingFiles(false)
        })
    } catch (err: unknown) {
      setFilesError(err instanceof Error ? err.message : "Gagal menginisiasi unggah file")
      setIsUploadingFiles(false)
    }
  }

  // Upload file via standard PUT request to presigned URL
  async function uploadFileToPresignedUrl(
    url: string,
    file: File,
    onProgress: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", url)
      xhr.setRequestHeader("Content-Type", file.type || "application/pdf")

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          onProgress(percent)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Server returned status ${xhr.status}`))
        }
      }

      xhr.onerror = () => reject(new Error("Network error during file upload staging"))
      xhr.send(file)
    })
  }

  // Start background worker processing
  async function handleStartProcessing() {
    if (!job) return
    setIsProcessing(true)
    setProcessError(null)
    try {
      const result = await startBulkJobProcessingApi(job.jobId)

      // Start polling status
      startStatusPolling(result.jobId)
    } catch (err: unknown) {
      setProcessError(err instanceof Error ? err.message : "Gagal memulai pemrosesan batch")
      setIsProcessing(false)
    }
  }

  // Poll status interval
  function startStatusPolling(jobId: string) {
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(async () => {
      try {
        const updatedJob = await getBulkJobStatusApi(jobId)
        setJob(updatedJob)

        const itemsResult = await getBulkJobItemsApi(jobId, 1, 100)
        setJobItems(itemsResult.items)

        if (
          updatedJob.status === "COMPLETED" ||
          updatedJob.status === "COMPLETED_WITH_ERRORS" ||
          updatedJob.status === "FAILED" ||
          updatedJob.status === "CANCELLED"
        ) {
          clearInterval(intervalRef.current!)
          setIsProcessing(false)
        }
      } catch (err) {
        console.error("Error polling job status:", err)
      }
    }, 2000)
  }

  const uploadedFilesCount = Object.values(fileStatuses).filter((s) => s.status === "success").length
  const failedFilesCount = Object.values(fileStatuses).filter((s) => s.status === "failed").length
  const totalFilesCount = Object.keys(fileStatuses).length

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <section>
          <div className="mb-8">
            <Link
              href="/admin/ijazah"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Data Ijazah
            </Link>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Bulk Upload Ijazah
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Unggah ijazah dalam jumlah besar secara asinkron menggunakan manifest Excel dan berkas PDF pendukung.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Step 1: Initial */}
            {step === "init" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
                <FileText className="mx-auto h-16 w-16 text-blue-700" />
                <h3 className="mt-4 text-xl font-bold text-slate-950">Mulai Proses Bulk Upload Baru</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Pastikan Anda sudah menyiapkan berkas Excel template ijazah dan seluruh dokumen PDF pendukung.
                </p>
                <button
                  onClick={handleInitJob}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <Play weight="fill" className="h-4 w-4" />
                  Mulai Import Batch
                </button>
              </div>
            )}

            {/* Step 2: Upload Excel Manifest */}
            {step === "manifest" && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
                <div className="border-b border-slate-200 p-6">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                    <FileText className="h-5 w-5 text-blue-700" />
                    Tahap 1: Unggah Manifest Excel
                  </h2>
                </div>

                <div className="p-6">
                  <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center">
                    <UploadSimple className="mx-auto h-10 w-10 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600">Pilih berkas Excel (.xlsx) sebagai manifest ijazah</p>
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={handleExcelChange}
                      className="mt-4 text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>

                  {excelFile && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
                      <FileText className="h-5 w-5 shrink-0" />
                      <span>Berkas terpilih: <strong>{excelFile.name}</strong> ({Math.round(excelFile.size / 1024)} KB)</span>
                    </div>
                  )}

                  {manifestError && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                      <WarningCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <span>{manifestError}</span>
                    </div>
                  )}

                  {validationResult && validationResult.invalidRows.length > 0 && (
                    <div className="mt-4 max-h-60 overflow-y-auto rounded-lg border border-red-200 bg-red-50/50 p-4">
                      <h4 className="text-sm font-bold text-red-950">Detail Kesalahan Baris Excel:</h4>
                      <ul className="mt-2 divide-y divide-red-100 text-xs text-red-700">
                        {validationResult.invalidRows.map((row) => (
                          <li key={row.rowNumber} className="py-2">
                            Baris {row.rowNumber}: {row.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleUploadManifest}
                      disabled={!excelFile || isUploadingManifest}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingManifest ? "Memvalidasi..." : "Unggah & Validasi Manifest"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Upload PDF Documents */}
            {step === "files" && job && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
                <div className="border-b border-slate-200 p-6">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                    <Folder className="h-5 w-5 text-blue-700" />
                    Tahap 2: Unggah Dokumen PDF
                  </h2>
                </div>

                <div className="p-6">
                  <p className="text-sm text-slate-600 mb-4">
                    Sistem mendeteksi total <strong>{job.totalItems}</strong> sertifikat ijazah dalam manifest. Silakan pilih folder atau sekumpulan berkas PDF yang sesuai dengan manifest Excel.
                  </p>

                  <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center">
                    <Folder className="mx-auto h-10 w-10 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600">Pilih dokumen ijazah PDF pendukung</p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf"
                      onChange={handlePdfFilesChange}
                      className="mt-4 text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>

                  {pdfFiles.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
                      <div className="flex items-center gap-2">
                        <Folder className="h-5 w-5 shrink-0" />
                        <span>Jumlah berkas terpilih: <strong>{pdfFiles.length}</strong> PDF</span>
                      </div>
                      {pdfFiles.length !== job.totalItems && (
                        <div className="text-xs font-semibold text-amber-700 mt-1">
                          ⚠️ Peringatan: Jumlah file PDF terpilih ({pdfFiles.length}) tidak sama dengan jumlah baris manifest ({job.totalItems}).
                        </div>
                      )}
                    </div>
                  )}

                  {isUploadingFiles && (
                    <div className="mt-6 border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex justify-between items-center text-sm font-semibold text-slate-700 mb-2">
                        <span>Mengunggah Berkas...</span>
                        <span>{uploadedFilesCount} / {totalFilesCount} Berhasil</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-700 transition-all duration-300"
                          style={{ width: `${(uploadedFilesCount / totalFilesCount) * 100}%` }}
                        />
                      </div>
                      {failedFilesCount > 0 && (
                        <div className="text-xs text-red-600 font-semibold mt-2">
                          Gagal mengunggah {failedFilesCount} file.
                        </div>
                      )}
                    </div>
                  )}

                  {filesError && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                      <WarningCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <span>{filesError}</span>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setStep("manifest")}
                      className="px-5 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={handleUploadFiles}
                      disabled={pdfFiles.length === 0 || isUploadingFiles}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingFiles ? "Mengunggah..." : "Unggah PDF Berkas"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Start processing and progress monitor */}
            {step === "process" && job && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]">
                <div className="border-b border-slate-200 p-6">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                    <CheckCircle className="h-5 w-5 text-blue-700" />
                    Tahap 3: Pemrosesan Batch Asinkron
                  </h2>
                </div>

                <div className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-950 mb-2">Informasi Import Batch</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                        <div>ID Pekerjaan: <span className="font-mono font-semibold text-slate-800">{job.jobId}</span></div>
                        <div>Status: <span className="font-semibold text-slate-800">{job.status}</span></div>
                        <div>Total Data: <span className="font-semibold text-slate-800">{job.totalItems}</span></div>
                        <div>Progres: <span className="font-semibold text-slate-800">{job.processedItems} Selesai / {job.failedItems} Gagal</span></div>
                      </div>
                    </div>

                    {job.status === "READY" && (
                      <div className="text-center py-6">
                        <p className="text-sm text-slate-600 mb-4">Semua manifest dan file staging ijazah siap diterbitkan ke Blockchain & IPFS.</p>
                        <button
                          onClick={handleStartProcessing}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
                        >
                          <Play weight="fill" className="h-4 w-4" />
                          Mulai Terbitkan Ijazah
                        </button>
                      </div>
                    )}

                    {job.status === "PROCESSING" && (
                      <div className="border border-slate-200 rounded-lg p-6 bg-slate-50/50">
                        <div className="flex justify-between items-center text-sm font-bold text-slate-800 mb-2">
                          <span>Menerbitkan Ke Ledger & IPFS...</span>
                          <span>{job.processedItems + job.failedItems} / {job.totalItems} ({Math.round(((job.processedItems + job.failedItems) / job.totalItems) * 100)}%)</span>
                        </div>
                        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-700 transition-all duration-300"
                            style={{ width: `${((job.processedItems + job.failedItems) / job.totalItems) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {job.status === "COMPLETED" && (
                      <div className="rounded-lg bg-green-50 p-4 border border-green-200 flex items-start gap-3">
                        <CheckCircle className="h-6 w-6 text-green-700 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-green-950">Bulk Import Sukses!</h4>
                          <p className="text-xs text-green-700 mt-1">Seluruh ijazah ({job.totalItems}) telah berhasil disimpan ke database PostgreSQL, diunggah ke IPFS, dan diterbitkan ke Hyperledger Fabric ledger.</p>
                        </div>
                      </div>
                    )}

                    {job.status === "COMPLETED_WITH_ERRORS" && (
                      <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 flex items-start gap-3">
                        <WarningCircle className="h-6 w-6 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-amber-950">Bulk Import Selesai dengan Beberapa Error</h4>
                          <p className="text-xs text-amber-700 mt-1">Proses penerbitan selesai, namun terdapat {job.failedItems} ijazah yang gagal diproses. Silakan cek detail list kesalahan di bawah.</p>
                        </div>
                      </div>
                    )}

                    {processError && (
                      <div className="flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                        <WarningCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <span>{processError}</span>
                      </div>
                    )}

                    {jobItems.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-sm font-bold text-slate-950 mb-3">Daftar Item Batch</h3>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                              <tr>
                                <th className="px-4 py-3">Nomor Ijazah</th>
                                <th className="px-4 py-3">File PDF</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Pesan Error</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {jobItems.map((item) => (
                                <tr key={item.itemId}>
                                  <td className="px-4 py-3 font-mono font-medium">{item.certificateNumber}</td>
                                  <td className="px-4 py-3 text-slate-600">{item.pdfFileName}</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                      item.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                                      item.status === "FAILED" ? "bg-red-100 text-red-800" :
                                      "bg-blue-100 text-blue-800"
                                    }`}>
                                      {item.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-red-600 font-medium max-w-xs truncate" title={item.errorMessage || undefined}>
                                    {item.errorMessage || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </AdminShell>
  )
}
