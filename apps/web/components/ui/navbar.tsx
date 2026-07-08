"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Certificate } from "@phosphor-icons/react"

const navItems = [
  {
    label: "Verifikasi",
    href: "/",
  }
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 shadow-sm backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-3 items-center px-6 py-4">
        <Link href="/" className="flex items-center gap-3 justify-self-start">
          <Certificate weight="fill" className="h-7 w-7 text-blue-700" />
          <span className="text-xl font-bold tracking-tight text-slate-950">
            IjazahChain
          </span>
        </Link>

        <div className="hidden items-center justify-center gap-2 md:flex">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
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
      </div>
    </nav>
  )
}