"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Certificate } from "@phosphor-icons/react"

const adminNavItems = [
  {
    label: "Data Ijazah",
    href: "/admin/ijazah",
  }
]

export default function AdminNavbar() {
  const pathname = usePathname()

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    })

    window.location.href = "/login"
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 shadow-sm backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-3 items-center px-6 py-4">
        <Link href="/admin/ijazah" className="flex items-center gap-3 justify-self-start">
          <Certificate weight="fill" className="h-7 w-7 text-blue-700" />
          <span className="text-xl font-bold tracking-tight text-slate-950">
            IjazahChain Admin
          </span>
        </Link>

        <div className="hidden items-center justify-center gap-2 md:flex">
          {adminNavItems.map((item) => {
            const isActive =
              item.href === "/admin/ijazah"
                ? pathname === "/admin/ijazah"
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "border-b-2 border-blue-700 font-bold text-blue-700"
                    : "font-medium text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="hidden justify-self-end md:block">
          <button
            type="button"
            onClick={logout}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}