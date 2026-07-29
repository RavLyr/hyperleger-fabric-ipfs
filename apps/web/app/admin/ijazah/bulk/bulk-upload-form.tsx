"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Folder, WarningCircle, CheckCircle, DownloadSimple } from "@phosphor-icons/react/dist/ssr"
import { useBulkUpload } from "@/components/providers/bulk-upload-provider"
import type { AuthSession } from "@/lib/auth/session"


type BulkUploadFormProps = {
  session: AuthSession
  isModal?: boolean
  onCancel?: () => void
}

export default function BulkUploadForm({ session, isModal, onCancel }: BulkUploadFormProps) {
  const router = useRouter()
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [pdfFiles, setPdfFiles] = useState<File[]>([])
  const [localError, setLocalError] = useState<string | null>(null)
  const { startBulkUpload } = useBulkUpload()

  function handleExcelChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setExcelFile(file)
      setLocalError(null)
    }
  }

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files) {
      const fileList = Array.from(files).filter((file) => file.name.endsWith(".pdf"))
      setPdfFiles(fileList)
      setLocalError(null)
    }
  }

  async function handleSubmit() {
    if (!excelFile) {
      setLocalError("Please select an Excel/CSV file first.")
      return
    }
    if (pdfFiles.length === 0) {
      setLocalError("Please select at least 1 certificate PDF file.")
      return
    }

    setLocalError(null)
    
    // Start upload in background
    startBulkUpload(excelFile, pdfFiles)

    // Close the form immediately
    if (onCancel) onCancel()
    else if (!isModal) router.push("/admin/ijazah")
  }



  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-950">Bulk Upload Certificates</h1>
        <p className="mt-2 text-sm text-slate-600">Upload student certificate CSV or Excel file.</p>
      </div>

      {localError && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          <WarningCircle weight="fill" className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 mb-4">
        {/* EXCEL UPLOAD FIELD */}
        <label className="flex flex-col items-center justify-center cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-slate-400 hover:bg-slate-50">
          <FileText className="h-8 w-8 text-slate-400 mb-3" />
          <p className="text-sm font-bold text-slate-700">Select Excel / CSV File</p>
          {excelFile ? (
            <p className="mt-3 text-xs text-blue-700 font-bold bg-blue-100 px-3 py-1.5 rounded-full">{excelFile.name}</p>
          ) : (
            <p className="mt-3 text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1.5 rounded-full">Select File</p>
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
          <p className="text-sm font-bold text-slate-700">Select Certificate PDFs</p>
          {pdfFiles.length > 0 ? (
            <p className="mt-3 text-xs text-blue-700 font-bold bg-blue-100 px-3 py-1.5 rounded-full">{pdfFiles.length} PDF files selected</p>
          ) : (
            <p className="mt-3 text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1.5 rounded-full">Select files</p>
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



      <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() => {
            if (onCancel) onCancel()
            else if (isModal) window.location.reload()
            else window.history.back()
          }}
          className="rounded-lg px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!excelFile || pdfFiles.length === 0}
          className="rounded-lg bg-blue-700 px-8 py-2.5 text-sm font-bold text-white hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    </div>
  )
}
