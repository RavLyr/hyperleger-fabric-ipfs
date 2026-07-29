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

  const faculty = String(formData.get("faculty") ?? "").trim()
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
    !faculty ||
    !studyProgram ||
    !educationLevel ||
    !issuedAtRaw
  ) {
    throw new Error(
      "Student name, student ID, certificate number, certificate type, degree, faculty, study program, education level, and issue date are required."
    )
  }

  if (graduationDateRaw && !graduationDate) {
    throw new Error("Invalid graduation date.")
  }

  if (!issuedAt) {
    throw new Error("Invalid issue date.")
  }

  if (expiredAtRaw && !expiredAt) {
    throw new Error("Invalid expiration date.")
  }

  if (!isValidUploadedFile(certificateFile)) {
    throw new Error("Certificate file is required.")
  }

  if (session.role === "ISSUER_ADMIN" && !issuerScope) {
    throw new Error("Issuer not found in login session.")
  }

  if (
    !session.issuerId ||
    !session.organizationName ||
    !session.mspId
  ) {
    throw new Error("Incomplete issuer data in session. Please login again.")
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

  let uploadedCertificate: Awaited<ReturnType<typeof uploadCertificate>>

  try {
    uploadedCertificate = await uploadCertificate({
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
      faculty,
      studyProgram,
      educationLevel,

      issuedAt: issuedAtRaw,
      graduationDate: graduationDateRaw || undefined,
      expiredAt: expiredAtRaw || undefined,
    })
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to upload certificate. Please try again."
    )
  }

  if (!uploadedCertificate.certificateId) {
    throw new Error(
      "Upload successful, but backend did not return a certificateId."
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