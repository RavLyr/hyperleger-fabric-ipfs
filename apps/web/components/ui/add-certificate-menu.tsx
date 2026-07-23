"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Plus, FileText, X } from "@phosphor-icons/react/dist/ssr"
import BulkUploadForm from "@/app/admin/ijazah/bulk/bulk-upload-form"
import type { AuthSession } from "@/lib/auth/session"

type AddCertificateMenuProps = {
  session: AuthSession
}

export default function AddCertificateMenu({ session }: AddCertificateMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isModalOpen])

  return (
    <>
      <div className="relative inline-block text-left" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          <Plus weight="bold" className="h-4 w-4" />
          Tambah Ijazah
        </button>

        {isOpen && (
          <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2">
              <Link
                href="/admin/ijazah/add"
                onClick={() => setIsOpen(false)}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition group-hover:bg-white group-hover:text-slate-900 group-hover:shadow-sm border border-transparent group-hover:border-slate-200">
                  <Plus weight="bold" className="h-4 w-4" />
                </div>
                Tambah 1 per 1
              </Link>
              
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setIsModalOpen(true)
                }}
                className="group mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition group-hover:bg-white group-hover:text-blue-700 group-hover:shadow-sm border border-transparent group-hover:border-slate-200">
                  <FileText weight="bold" className="h-4 w-4" />
                </div>
                Upload Ijazah Massal
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/60 animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <h2 className="text-lg font-bold text-slate-900">Upload Ijazah Massal (Bulk Upload)</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X weight="bold" className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 pt-2">
              <BulkUploadForm session={session} isModal onCancel={() => setIsModalOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
