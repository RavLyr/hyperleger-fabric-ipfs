import Link from "next/link"

export default function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-6 px-6 py-4 md:flex-row">
        <div className="text-center md:text-left">
          <p className="text-lg font-bold text-slate-900">IjazahChain</p>
          <p className="mt-1 text-sm text-slate-500">
            © 2026 IjazahChain. Academic Authority Verified.
          </p>
        </div>
      </div>
    </footer>
  )
}