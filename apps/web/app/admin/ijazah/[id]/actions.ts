"use server"

import { createHash } from "crypto"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getIssuerScope, requireAdminSession } from "@/lib/auth/session"
import {
  getLedgerCertificateDetail,
  revokeLedgerCertificate,
} from "@/lib/backend-api/certificates"

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function normalizeStatus(status?: string | null) {
  return String(status ?? "").toUpperCase()
}

export async function revokeDiploma(
  certificateId: string,
  formData: FormData
) {
  const session = await requireAdminSession()
  const issuerScope = getIssuerScope(session)

  const reason = String(formData.get("reason") ?? "").trim()

  if (!certificateId) {
    throw new Error("Certificate ID tidak ditemukan.")
  }

  if (!reason) {
    throw new Error("Alasan pencabutan wajib diisi.")
  }

  const certificate = await getLedgerCertificateDetail(certificateId).catch(
    () => null
  )

  if (!certificate) {
    redirect("/admin/ijazah?notFound=1")
  }

  if (issuerScope && certificate.issuerId !== issuerScope) {
    redirect("/admin/ijazah?forbidden=1")
  }

  if (normalizeStatus(certificate.status) === "REVOKED") {
    redirect(
      `/admin/ijazah/${encodeURIComponent(
        certificate.certificateId
      )}?alreadyRevoked=1`
    )
  }

  const revokedAt = new Date().toISOString()
  const reasonHash = hashText(reason)

  await revokeLedgerCertificate(
    certificate.certificateId,
    reason,
    reasonHash,
    revokedAt
  )

  revalidatePath("/admin/ijazah")
  revalidatePath(`/admin/ijazah/${certificate.certificateId}`)
  revalidatePath(`/ijazah/${certificate.certificateId}/qr`)
  revalidatePath("/ijazah/verifikasi")

  redirect(
    `/admin/ijazah/${encodeURIComponent(certificate.certificateId)}?revoked=1`
  )
}