import { Suspense } from "react"
import VerificationClient from "./verification-client"

export default function VerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm font-semibold text-slate-600">
          Memuat halaman verifikasi...
        </div>
      }
    >
      <VerificationClient />
    </Suspense>
  )
}