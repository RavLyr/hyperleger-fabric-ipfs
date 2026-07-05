import type { ReactNode } from "react"
import Navbar from "@/components/ui/navbar"

type PageShellProps = {
  children: ReactNode
}

export default function PageShell({ children }: PageShellProps) {
  return (
    <div className="relative isolate min-h-dvh w-full overflow-x-hidden bg-slate-50 text-slate-900">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(118, 119, 125, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(118, 119, 125, 0.08) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <Navbar />

      {children}
    </div>
  )
}