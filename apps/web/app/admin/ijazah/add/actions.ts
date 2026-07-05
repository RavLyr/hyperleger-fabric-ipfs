"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getIssuerScope, requireAdminSession } from "@/lib/auth/session"
import {
  uploadCertificate,
  verifyCertificateByNumber,
} from "@/lib/backend-api/certificates"

function parseDateInput(value: string) {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function isValidUploadedFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0
}

async function findExistingCertificateByNumber(certificateNumber: string) {
  try {
    const result = await verifyCertificateByNumber(certificateNumber)

    if (result.success && result.dbData?.certificateId) {
      return result.dbData
    }

    return null
  } catch {
    return null
  }
}

export async function createDiploma(formData: FormData) {
  const session = await requireAdminSession()
  const issuerScope = getIssuerScope(session)

  const studentName = String(formData.get("studentName") ?? "").trim()

  const studentId = String(
    formData.get("studentId") ?? formData.get("nim") ?? ""
  ).trim()

  const certificateNumber = String(
    formData.get("certificateNumber") ??
      formData.get("diplomaNumber") ??
      ""
  ).trim()

  const certificateType =
    String(formData.get("certificateType") ?? "").trim() || "IJAZAH"

  const degreeTitle = String(
    formData.get("degreeTitle") ?? formData.get("title") ?? ""
  ).trim()

  const studyProgram = String(formData.get("studyProgram") ?? "").trim()
  const educationLevel = String(formData.get("educationLevel") ?? "").trim()

  const graduationDateRaw = String(
    formData.get("graduationDate") ?? ""
  ).trim()

  const issuedAtRaw = String(formData.get("issuedAt") ?? "").trim()
  const expiredAtRaw = String(formData.get("expiredAt") ?? "").trim()

  const graduationDate = parseDateInput(graduationDateRaw)
  const issuedAt = parseDateInput(issuedAtRaw)
  const expiredAt = parseDateInput(expiredAtRaw)

  const certificateFile = formData.get("certificateFile")

  if (
    !studentName ||
    !studentId ||
    !certificateNumber ||
    !certificateType ||
    !degreeTitle ||
    !studyProgram ||
    !educationLevel ||
    !issuedAtRaw
  ) {
    throw new Error(
      "Nama mahasiswa, NIM, nomor ijazah, jenis ijazah, gelar, program studi, jenjang pendidikan, dan tanggal terbit wajib diisi."
    )
  }

  if (graduationDateRaw && !graduationDate) {
    throw new Error("Tanggal lulus tidak valid.")
  }

  if (!issuedAt) {
    throw new Error("Tanggal terbit tidak valid.")
  }

  if (expiredAtRaw && !expiredAt) {
    throw new Error("Tanggal kedaluwarsa tidak valid.")
  }

  if (!isValidUploadedFile(certificateFile)) {
    throw new Error("File ijazah wajib diunggah.")
  }

  if (session.role === "ISSUER_ADMIN" && !issuerScope) {
    throw new Error("Issuer tidak ditemukan dari session login.")
  }

  if (
    !session.issuerId ||
    !session.organizationName ||
    !session.departmentName ||
    !session.mspId
  ) {
    throw new Error("Data issuer pada session tidak lengkap. Silakan login ulang.")
  }

  const existingCertificate = await findExistingCertificateByNumber(
    certificateNumber
  )

  if (existingCertificate) {
    const canAccessExistingCertificate =
      session.role === "ADMIN" || existingCertificate.issuerId === issuerScope

    if (canAccessExistingCertificate) {
      redirect(
        `/admin/ijazah/${encodeURIComponent(
          existingCertificate.certificateId
        )}/qr?duplicate=1`
      )
    }

    redirect("/admin/ijazah?duplicate=1")
  }

  const uploadedCertificate = await uploadCertificate({
    file: certificateFile,

    certificateNumber,

    issuerId: session.issuerId,
    organizationName: session.organizationName,
    departmentName: session.departmentName,
    mspId: session.mspId,

    certificateType,
    degreeTitle,

    studentId,
    studentName,
    studyProgram,
    educationLevel,

    issuedAt: issuedAtRaw,
    graduationDate: graduationDateRaw || undefined,
    expiredAt: expiredAtRaw || undefined,
  })

  if (!uploadedCertificate.certificateId) {
    throw new Error(
      "Upload berhasil, tetapi backend tidak mengembalikan certificateId."
    )
  }

  revalidatePath("/admin/ijazah")
  revalidatePath(`/admin/ijazah/${uploadedCertificate.certificateId}`)
  revalidatePath(`/admin/ijazah/${uploadedCertificate.certificateId}/qr`)
  revalidatePath(`/ijazah/${certificateNumber}/qr`)
  revalidatePath("/ijazah/verifikasi")

  redirect(
    `/admin/ijazah/${encodeURIComponent(uploadedCertificate.certificateId)}/qr`
  )
}