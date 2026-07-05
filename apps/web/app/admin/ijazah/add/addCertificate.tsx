"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import { createDiploma } from "./actions"
import AdminShell from "@/components/ui/admin-shell"
import Footer from "@/components/ui/footer"
import { certificateProgramOptions } from "@/lib/certificates-program-options"
import {
  ArrowLeft,
  FileText,
  FloppyDisk,
  UploadSimple,
} from "@phosphor-icons/react"

export default function AddCertificate() {
  const formRef = useRef<HTMLFormElement>(null)
  const confirmedSubmitRef = useRef(false)

  const [fileName, setFileName] = useState("")
  const [selectedFaculty, setSelectedFaculty] = useState("")
  const [selectedStudyProgram, setSelectedStudyProgram] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const facultyOptions = useMemo(() => {
    return Array.from(
      new Set(certificateProgramOptions.map((program) => program.faculty))
    ).sort((a, b) => a.localeCompare(b))
  }, [])

  const programOptions = useMemo(() => {
    const map = new Map<string, (typeof certificateProgramOptions)[number]>()

    for (const program of certificateProgramOptions) {
      if (program.faculty !== selectedFaculty) {
        continue
      }

      if (!map.has(program.studyProgram)) {
        map.set(program.studyProgram, program)
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.studyProgram.localeCompare(b.studyProgram)
    )
  }, [selectedFaculty])

  const selectedProgram = useMemo(() => {
    return programOptions.find(
      (program) => program.studyProgram === selectedStudyProgram
    )
  }, [programOptions, selectedStudyProgram])

  function handleFacultyChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedFaculty(event.target.value)
    setSelectedStudyProgram("")
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      setFileName("")
      return
    }

    setFileName(file.name)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmedSubmitRef.current) {
      setIsSubmitting(true)
      return
    }

    event.preventDefault()
    setShowConfirmDialog(true)
  }

  function handleCancelSubmit() {
    setShowConfirmDialog(false)
    setIsSubmitting(false)
    confirmedSubmitRef.current = false
  }

  function handleConfirmSubmit() {
    setShowConfirmDialog(false)
    confirmedSubmitRef.current = true
    formRef.current?.requestSubmit()
  }

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <section>
          <div className="mb-8">
            <Link
              href="/admin/ijazah"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Data Ijazah
            </Link>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Tambah Ijazah
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Masukkan data ijazah yang akan diterbitkan.
            </p>
          </div>

          <form
            ref={formRef}
            action={createDiploma}
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0px_10px_30px_-5px_rgba(37,99,235,0.08)]"
          >
            <div className="border-b border-slate-200 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                <FileText className="h-5 w-5 text-blue-700" />
                Data Sertifikat
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
              <Field
                label="Nama Mahasiswa"
                name="studentName"
                placeholder="Contoh: Salimul Qolbi"
                required
              />

              <Field
                label="NIM / Student ID"
                name="studentId"
                placeholder="Contoh: 21120125120016"
                required
              />

              <Field
                label="Nomor Ijazah / Certificate Number"
                name="certificateNumber"
                placeholder="Contoh: IJZ-2026-001"
                required
              />

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Jenis Ijazah
                </label>

                <select
                  name="certificateType"
                  required
                  defaultValue="IJAZAH"
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="IJAZAH">IJAZAH</option>
                  <option value="DIPLOMA">DIPLOMA</option>
                  <option value="CERTIFICATE">CERTIFICATE</option>
                  <option value="TRANSCRIPT">TRANSCRIPT</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Fakultas / Sekolah
                </label>

                <select
                  name="faculty"
                  required
                  value={selectedFaculty}
                  onChange={handleFacultyChange}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">Pilih fakultas</option>

                  {facultyOptions.map((faculty) => (
                    <option key={faculty} value={faculty}>
                      {faculty}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Program Studi
                </label>

                <select
                  name="studyProgram"
                  required
                  value={selectedStudyProgram}
                  disabled={!selectedFaculty}
                  onChange={(event) =>
                    setSelectedStudyProgram(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {selectedFaculty
                      ? "Pilih program studi"
                      : "Pilih fakultas terlebih dahulu"}
                  </option>

                  {programOptions.map((program) => (
                    <option
                      key={`${program.faculty}-${program.educationLevel}-${program.studyProgram}-${program.degreeTitle}`}
                      value={program.studyProgram}
                    >
                      {program.studyProgram}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Jenjang Pendidikan
                </label>

                <input
                  name="educationLevel"
                  type="text"
                  required
                  readOnly
                  value={selectedProgram?.educationLevel ?? ""}
                  placeholder="Otomatis terisi"
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm text-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Gelar / Degree Title
                </label>

                <input
                  name="degreeTitle"
                  type="text"
                  required
                  readOnly
                  value={selectedProgram?.degreeTitle ?? ""}
                  placeholder="Otomatis terisi setelah program studi dipilih"
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm text-slate-700 outline-none"
                />
              </div>

              <Field
                label="Tanggal Lulus"
                name="graduationDate"
                type="date"
              />

              <Field
                label="Tanggal Terbit"
                name="issuedAt"
                type="date"
                required
              />

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  File Ijazah
                </label>

                <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
                  <UploadSimple className="h-8 w-8 text-blue-700" />

                  <span className="mt-3 text-sm font-bold text-slate-900">
                    Upload file ijazah
                  </span>

                  <span className="mt-1 text-xs text-slate-500">
                    Format PDF.
                  </span>

                  {fileName && (
                    <span className="mt-4 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {fileName}
                    </span>
                  )}

                  <input
                    name="certificateFile"
                    type="file"
                    accept="application/pdf"
                    required
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:justify-end">
              <Link
                href="/admin/ijazah"
                className={`inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 ${
                  isSubmitting ? "pointer-events-none opacity-60" : ""
                }`}
              >
                Batal
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Memproses Data Ijazah...
                  </>
                ) : (
                  <>
                    <FloppyDisk className="h-4 w-4" />
                    Simpan & Generate QR
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </main>

      <Footer />

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-950">
              Konfirmasi Data Ijazah
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Apakah yakin data sudah sesuai? Pastikan nama mahasiswa, NIM,
              nomor ijazah, program studi, gelar, tanggal terbit, dan file
              ijazah sudah benar sebelum data diproses.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelSubmit}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Tidak
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-600"
              >
                Ya, Submit Data
              </button>
            </div>
          </div>
        </div>
      )}

      {isSubmitting && !showConfirmDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-xl">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />

            <p className="mt-4 text-sm font-bold text-slate-900">
              Memproses data ijazah...
            </p>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </div>
  )
}