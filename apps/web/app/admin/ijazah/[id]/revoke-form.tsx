"use client"

import { useRef, useState } from "react"
import { revokeDiploma } from "./actions"

type RevokeDiplomaFormProps = {
  certificateId: string
}

export default function RevokeDiplomaForm({
  certificateId,
}: RevokeDiplomaFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const confirmedSubmitRef = useRef(false)

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmedSubmitRef.current) {
      setIsSubmitting(true)
      return
    }

    event.preventDefault()
    setShowConfirmDialog(true)
  }

  function handleCancelRevoke() {
    setShowConfirmDialog(false)
    setIsSubmitting(false)
    confirmedSubmitRef.current = false
  }

  function handleConfirmRevoke() {
    setShowConfirmDialog(false)
    confirmedSubmitRef.current = true
    formRef.current?.requestSubmit()
  }

  return (
    <>
      <form
        ref={formRef}
        action={revokeDiploma.bind(null, certificateId)}
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <div>
          <label
            htmlFor="reason"
            className="text-sm font-semibold text-slate-700"
          >
            Alasan Pencabutan
          </label>

          <textarea
            id="reason"
            name="reason"
            required
            rows={4}
            placeholder="Contoh: Data ijazah salah dan perlu dicabut."
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Memproses Revoke...
            </>
          ) : (
            "Revoke Ijazah"
          )}
        </button>
      </form>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-950">
              Konfirmasi Revoke Ijazah
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Apakah kamu yakin ingin mencabut ijazah ini? Setelah ijazah
              direvoke, status ijazah akan berubah menjadi tidak valid dan data
              verifikasi publik akan menampilkan status pencabutan.
            </p>

            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-700">
                Tindakan ini bersifat penting dan tidak boleh dilakukan jika data
                masih benar.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelRevoke}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Tidak
              </button>

              <button
                type="button"
                onClick={handleConfirmRevoke}
                className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"
              >
                Ya, Revoke Ijazah
              </button>
            </div>
          </div>
        </div>
      )}

      {isSubmitting && !showConfirmDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center rounded-2xl border border-red-100 bg-white px-8 py-6 shadow-xl">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-red-100 border-t-red-700" />

            <p className="mt-4 text-sm font-bold text-slate-900">
              Memproses revoke ijazah...
            </p>
          </div>
        </div>
      )}
    </>
  )
}