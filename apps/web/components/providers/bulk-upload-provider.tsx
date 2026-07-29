"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  createBulkJobApi,
  uploadBulkManifestApi,
  requestUploadUrlsApi,
  completeBulkUploadApi,
  startBulkJobProcessingApi,
  getBulkJobStatusApi,
  getBulkJobItemsApi,
} from "@/lib/backend-api/certificates"
import { CheckCircle, Spinner, WarningCircle, X } from "@phosphor-icons/react/dist/ssr"

type ProgressState = {
  step: string
  percent: number
}

type BulkUploadContextType = {
  startBulkUpload: (excelFile: File, pdfFiles: File[]) => Promise<void>
  isUploading: boolean
  progress: ProgressState | null
  error: string | null
  success: boolean
  dismissToast: () => void
}

const BulkUploadContext = createContext<BulkUploadContextType | undefined>(undefined)

export function useBulkUpload() {
  const context = useContext(BulkUploadContext)
  if (!context) {
    throw new Error("useBulkUpload must be used within a BulkUploadProvider")
  }
  return context
}

export function BulkUploadProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const dismissToast = () => {
    setIsUploading(false)
    setProgress(null)
    setError(null)
    setSuccess(false)
  }

  const startBulkUpload = async (excelFile: File, pdfFiles: File[]) => {
    if (isUploading) return

    setIsUploading(true)
    setError(null)
    setSuccess(false)
    setProgress({ step: "Initiating process...", percent: 10 })

    try {
      // 1. Init Job
      const job = await createBulkJobApi()

      // 2. Upload Manifest
      setProgress({ step: "Validating Excel...", percent: 20 })
      const result = await uploadBulkManifestApi(job.jobId, excelFile)
      if (result.validation.invalidRows.length > 0) {
        throw new Error(`${result.validation.invalidRows.length} Excel rows are invalid. Please fix and try again.`)
      }

      // 3. Request Upload URLs
      setProgress({ step: "Preparing PDF storage...", percent: 30 })
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
              reject(new Error(`PDF file ${urlItem.pdfFileName} not found in the upload queue.`))
              return
            }

            activeCount++

            uploadFileToPresignedUrl(urlItem.uploadUrl, file)
              .then(() => {
                completedCount++
                setProgress({
                  step: `Uploading PDF (${completedCount}/${totalFiles})...`,
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
      setProgress({ step: "Completing upload process...", percent: 85 })
      await completeBulkUploadApi(job.jobId)

      // Start background processing
      setProgress({ step: "Starting background issuance process...", percent: 95 })
      await startBulkJobProcessingApi(job.jobId)

      // Polling loop
      setProgress({ step: "Processing", percent: 96 })
      let isDone = false
      let finalJobStatus = null

      while (!isDone) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        try {
          const statusResult = await getBulkJobStatusApi(job.jobId)
          if (
            statusResult.status === "COMPLETED" || 
            statusResult.status === "COMPLETED_WITH_ERRORS" || 
            statusResult.status === "FAILED" || 
            statusResult.status === "CANCELLED"
          ) {
            isDone = true
            finalJobStatus = statusResult
          } else {
            // Update progress if processing
            const total = statusResult.totalItems || 1
            const rawProcessed = (statusResult.processedItems || 0) + (statusResult.failedItems || 0)
            const processed = Math.min(rawProcessed, total)
            setProgress({ 
              step: `Processing (${processed}/${total})...`, 
              percent: 96 + Math.round((processed / total) * 3)
            })
          }
        } catch (e) {
          // ignore polling error and retry
        }
      }

      setProgress(null)
      setIsUploading(false)

      if (finalJobStatus?.status === "FAILED" || finalJobStatus?.status === "CANCELLED") {
        throw new Error(`Job ended with status: ${finalJobStatus.status}`)
      }

      if (finalJobStatus?.status === "COMPLETED_WITH_ERRORS") {
        try {
          const itemsResponse = await getBulkJobItemsApi(job.jobId, 1, 100) // fetch up to 100 items
          const failedItems = itemsResponse.items.filter(i => i.status === "FAILED")
          const duplicateItems = failedItems.filter(i => i.errorMessage?.includes("already exists"))
          
          if (duplicateItems.length > 0) {
            setError(`${duplicateItems.length} certificate(s) already exist in the system (e.g. ${duplicateItems[0].certificateNumber}). Please fix duplicates and try again.`)
          } else {
            setError(`Job completed, but ${finalJobStatus.failedItems} items failed. Check job history.`)
          }
        } catch (e) {
          setError(`Job completed, but ${finalJobStatus.failedItems} items failed.`)
        }
      } else {
        setSuccess(true)
      }
      
      // Auto refresh dashboard and dismiss after some time
      setTimeout(() => {
        router.refresh()
        
        setTimeout(() => {
          dismissToast()
        }, 5000)
      }, 500)

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while processing data.")
      setSuccess(false)
      setIsUploading(false)
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

  return (
    <BulkUploadContext.Provider value={{ startBulkUpload, isUploading, progress, error, success, dismissToast }}>
      {children}
      
      {/* Toast UI */}
      {(isUploading || success || error) && (
        <div className="fixed top-4 right-4 z-[9999] w-80 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 relative">
              <button 
                onClick={dismissToast}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition"
              >
                <X weight="bold" />
              </button>
              
              {isUploading && progress && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <Spinner className="animate-spin text-blue-600 h-6 w-6 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Uploading Bulk Data</h4>
                      <p className="text-xs text-slate-500">{progress.step}</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </>
              )}

              {success && (
                <div className="flex items-start gap-3">
                  <CheckCircle weight="fill" className="text-green-500 h-6 w-6 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Upload Success</h4>
                    <p className="text-xs text-slate-500 mt-1">Data is being processed in background. Dashboard is refreshing...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3">
                  <WarningCircle weight="fill" className="text-red-500 h-6 w-6 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Upload Failed</h4>
                    <p className="text-xs text-slate-500 mt-1">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </BulkUploadContext.Provider>
  )
}
