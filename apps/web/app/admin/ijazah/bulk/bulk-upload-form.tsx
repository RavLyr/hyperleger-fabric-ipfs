"use client"

import { useState } from "react"
import { FileText, Folder, WarningCircle, CheckCircle, DownloadSimple } from "@phosphor-icons/react/dist/ssr"
import {
  createBulkJobApi,
  uploadBulkManifestApi,
  requestUploadUrlsApi,
  completeBulkUploadApi,
  startBulkJobProcessingApi,
} from "@/lib/backend-api/certificates"
import type { AuthSession } from "@/lib/auth/session"

type BulkUploadFormProps = {
  session: AuthSession
  isModal?: boolean
  onCancel?: () => void
}

export default function BulkUploadForm({ session, isModal, onCancel }: BulkUploadFormProps) {
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [pdfFiles, setPdfFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [progress, setProgress] = useState<{ step: string; percent: number } | null>(null)

  function handleExcelChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setExcelFile(file)
      setError(null)
    }
  }

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files) {
      const fileList = Array.from(files).filter((file) => file.name.endsWith(".pdf"))
      setPdfFiles(fileList)
      setError(null)
    }
  }

  async function handleSubmit() {
    if (!excelFile) {
      setError("Silakan pilih file Excel/CSV terlebih dahulu.")
      return
    }
    if (pdfFiles.length === 0) {
      setError("Silakan pilih minimal 1 file PDF ijazah.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // 1. Init Job
      setProgress({ step: "Menginisiasi proses...", percent: 10 })
      const job = await createBulkJobApi()

      // 2. Upload Manifest
      setProgress({ step: "Memvalidasi Excel...", percent: 20 })
      const result = await uploadBulkManifestApi(job.jobId, excelFile)
      if (result.validation.invalidRows.length > 0) {
        throw new Error(`${result.validation.invalidRows.length} baris Excel tidak valid. Silakan perbaiki dan coba lagi.`)
      }

      // 3. Request Upload URLs
      setProgress({ step: "Menyiapkan ruang penyimpanan PDF...", percent: 30 })
      const pdfNames = pdfFiles.map((f) => f.name)
      const { urls } = await requestUploadUrlsApi(job.jobId, pdfNames)

      // Map files to staging URLs
      const fileMap = new Map<string, File>()
      pdfFiles.forEach((file) => fileMap.set(file.name, file))

      // Upload with bounded concurrency
      const concurrency = 5
      const uploadQueue = [...urls]
      let activeCount = 0
      let completedCount = 0
      const totalFiles = urls.length

      await new Promise<void>((resolve, reject) => {
        function runNext() {
          if (uploadQueue.length === 0 && activeCount === 0) {
            resolve()
            return
          }

          while (uploadQueue.length > 0 && activeCount < concurrency) {
            const urlItem = uploadQueue.shift()!
            const file = fileMap.get(urlItem.pdfFileName)

            if (!file) {
              reject(new Error(`Berkas PDF ${urlItem.pdfFileName} tidak ditemukan dalam antrean unggah.`))
              return
            }

            activeCount++

            uploadFileToPresignedUrl(urlItem.uploadUrl, file)
              .then(() => {
                completedCount++
                setProgress({ 
                  step: `Mengunggah PDF (${completedCount}/${totalFiles})...`, 
                  percent: 30 + Math.round((completedCount / totalFiles) * 50) 
                })
              })
              .catch((err) => {
                reject(err)
              })
              .finally(() => {
                activeCount--
                runNext()
              })
          }
        }
        runNext()
      })

      // Signal backend that file upload is completed
      setProgress({ step: "Menyelesaikan proses unggah...", percent: 85 })
      await completeBulkUploadApi(job.jobId)

      // Start background processing
      setProgress({ step: "Memulai proses penerbitan di background...", percent: 95 })
      await startBulkJobProcessingApi(job.jobId)

      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses data.")
    } finally {
      setIsSubmitting(false)
      setProgress(null)
    }
  }

  // Upload file via standard PUT request to presigned URL
  async function uploadFileToPresignedUrl(url: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", url)
      xhr.setRequestHeader("Content-Type", file.type || "application/pdf")
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Server returned status ${xhr.status}`))
        }
      }
      xhr.onerror = () => reject(new Error("Network error during file upload"))
      xhr.send(file)
    })
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <CheckCircle weight="fill" className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Upload Berhasil Diproses!</h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md">
          Semua file telah terunggah dan sistem sedang menerbitkan ijazah ke Blockchain secara otomatis di background.
        </p>
        <button
          onClick={() => {
            if (onCancel) onCancel()
            else if (isModal) window.location.reload()
            else window.location.href = "/admin/ijazah"
          }}
          className="mt-6 rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
        >
          Tutup & Kembali ke Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-950">Upload Bulk Ijazah</h1>
        <p className="mt-2 text-sm text-slate-600">Unggah file CSV atau Excel ijazah mahasiswa.</p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          <WarningCircle weight="fill" className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 mb-4">
        {/* EXCEL UPLOAD FIELD */}
        <label className="flex flex-col items-center justify-center cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-slate-400 hover:bg-slate-50">
          <FileText className="h-8 w-8 text-slate-400 mb-3" />
          <p className="text-sm font-bold text-slate-700">Pilih File Excel / CSV</p>
          {excelFile ? (
            <p className="mt-3 text-xs text-blue-700 font-bold bg-blue-100 px-3 py-1.5 rounded-full">{excelFile.name}</p>
          ) : (
            <p className="mt-3 text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1.5 rounded-full">Pilih File</p>
          )}
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={handleExcelChange}
            className="sr-only"
          />
        </label>

        {/* PDF UPLOAD FIELD */}
        <label className="flex flex-col items-center justify-center cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50/50">
          <Folder className="h-8 w-8 text-slate-400 mb-3" />
          <p className="text-sm font-bold text-slate-700">Pilih PDF Ijazah</p>
          {pdfFiles.length > 0 ? (
            <p className="mt-3 text-xs text-blue-700 font-bold bg-blue-100 px-3 py-1.5 rounded-full">{pdfFiles.length} file PDF terpilih</p>
          ) : (
            <p className="mt-3 text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1.5 rounded-full">Pilih file</p>
          )}
          <input
            type="file"
            multiple
            // @ts-expect-error webkitdirectory is non-standard but widely supported
            webkitdirectory="true"
            directory="true"
            accept=".pdf"
            onChange={handlePdfChange}
            className="sr-only"
          />
        </label>
      </div>

      <div className="flex items-center justify-between mb-8 px-1">
        <a
          href="/templates/template-bulk-ijazah.xlsx"
          download
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 transition hover:underline"
        >
          <DownloadSimple weight="bold" className="h-4 w-4" />
          Download template
        </a>
      </div>

      {isSubmitting && progress && (
        <div className="mb-6 rounded-lg bg-slate-50 p-4 border border-slate-200">
          <div className="flex items-center justify-between text-sm font-bold text-slate-700 mb-2">
            <span>{progress.step}</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress.percent}%` }}></div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            if (onCancel) onCancel()
            else if (isModal) window.location.reload()
            else window.history.back()
          }}
          className="rounded-lg px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
        >
          Batal
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !excelFile || pdfFiles.length === 0}
          className="rounded-lg bg-blue-700 px-8 py-2.5 text-sm font-bold text-white hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Memproses..." : "Submit"}
        </button>
      </div>
    </div>
  )
}
