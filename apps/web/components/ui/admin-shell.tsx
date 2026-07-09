import type { ReactNode } from "react"
import AdminNavbar from "@/components/ui/admin-navbar"

type AdminShellProps = {
  children: ReactNode
}

export default function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="relative isolate flex min-h-dvh w-full flex-col overflow-x-hidden bg-slate-50 text-slate-900">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(118, 119, 125, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(118, 119, 125, 0.08) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <AdminNavbar />

      {children}
    </div>
  )
}