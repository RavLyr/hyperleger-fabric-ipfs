import { NextRequest, NextResponse } from "next/server"
import { verifyCertificateByNumber } from "@/lib/backend-api/certificates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type BackendResponse<T> = {
  success?: boolean
  message?: string
  data?: T
  error?: {
    message?: string
  }
}

type BackendIssuer = {
  issuerId?: string | null
  organizationName?: string | null
  departmentName?: string | null
  mspId?: string | null
  status?: string | null
}

function getBackendBaseUrl() {
  const baseUrl = process.env.BACKEND_BASE_URL

  if (!baseUrl) {
    throw new Error("BACKEND_BASE_URL belum diset.")
  }

  return baseUrl.replace(/\/$/, "")
}

function normalizeStatus(status?: string | null) {
  return String(status ?? "").toUpperCase()
}

function getVerificationMessage(status?: string | null, fallbackMessage?: string) {
  const normalizedStatus = normalizeStatus(status)

  if (normalizedStatus === "REVOKED") {
    return "Ijazah ditemukan, tetapi statusnya telah dicabut oleh penerbit."
  }

  if (normalizedStatus === "REISSUED") {
    return "Ijazah ditemukan, tetapi sudah diterbitkan ulang oleh penerbit."
  }

  if (normalizedStatus === "EXPIRED") {
    return "Ijazah ditemukan, tetapi masa berlakunya telah kedaluwarsa."
  }

  if (normalizedStatus === "VALID" || normalizedStatus === "ACTIVE") {
    return fallbackMessage || "Ijazah berhasil diverifikasi."
  }

  return fallbackMessage || "Ijazah ditemukan."
}

function getFinalStatus(
  ledgerStatus?: string | null,
  dbStatus?: string | null
) {
  return ledgerStatus ?? dbStatus ?? "UNKNOWN"
}

function getDocumentUrl(documentUrl?: string | null) {
  const url = documentUrl?.trim()

  if (!url) {
    return null
  }

  return url
}

async function getIssuerById(issuerId: string) {
  const response = await fetch(
    `${getBackendBaseUrl()}/api/issuers/${encodeURIComponent(issuerId)}`,
    {
      method: "GET",
      cache: "no-store",
    }
  )

  const result = (await response.json().catch(() => null)) as
    | BackendResponse<BackendIssuer>
    | null

  if (!response.ok || result?.success === false) {
    return null
  }

  return result?.data ?? null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const query =
      searchParams.get("q") ??
      searchParams.get("query") ??
      searchParams.get("number") ??
      searchParams.get("diplomaNumber") ??
      searchParams.get("certificateNumber") ??
      ""

    const nomorIjazah = query.trim()

    if (!nomorIjazah) {
      return NextResponse.json(
        {
          success: false,
          message: "Nomor ijazah wajib diisi.",
        },
        { status: 400 }
      )
    }

    const result = await verifyCertificateByNumber(nomorIjazah)

    if (!result.dbData) {
      return NextResponse.json({
        success: true,
        found: false,
        valid: false,
        data: null,
        message: "Data ijazah tidak ditemukan.",
      })
    }

    const dbData = result.dbData
    const issuerId = dbData.issuerId
    const issuer = issuerId ? await getIssuerById(issuerId).catch(() => null) : null

    const finalStatus = getFinalStatus(
      result.ledgerData?.status,
      dbData.status
    )

    const documentUrl = getDocumentUrl(result.documentUrl)

    const organizationName =
      issuer?.organizationName ??
      dbData.organizationName ??
      dbData.universityName ??
      null

    return NextResponse.json({
      success: true,
      found: true,
      valid: result.valid,
      message: getVerificationMessage(finalStatus, result.message),
      data: {
        id: dbData.id,

        certificateId: dbData.certificateId,
        certificateNumber: dbData.certificateNumber,
        diplomaNumber: dbData.certificateNumber,

        issuerId,
        issuer: {
          issuerId,
          organizationName,
          departmentName: issuer?.departmentName ?? null,
          mspId: issuer?.mspId ?? null,
          status: issuer?.status ?? null,
        },

        certificateType: dbData.certificateType,
        degreeTitle: dbData.degreeTitle ?? dbData.title ?? null,
        title: dbData.degreeTitle ?? dbData.title ?? null,
        studentId: dbData.studentId ?? null,
        nim: dbData.studentId ?? null,
        studentName: dbData.studentName ?? null,
        organizationName,
        universityName: organizationName,
        faculty: dbData.faculty ?? null,
        studyProgram: dbData.studyProgram ?? null,
        educationLevel: dbData.educationLevel ?? null,
        graduationDate: dbData.graduationDate ?? null,
        studentIdHash: dbData.studentIdHash ?? null,
        documentHash: dbData.documentHash ?? null,
        fileHash: dbData.documentHash ?? null,
        status: finalStatus,
        ipfsCid: dbData.ipfsCid ?? null,
        ledgerTxId: dbData.ledger_tx_id ?? null,
        ledger_tx_id: dbData.ledger_tx_id ?? null,
        documentUrl,
        uploadedFileName: dbData.file_name ?? null,
        file_name: dbData.file_name ?? null,
        uploadedFileMimeType: dbData.mime_type ?? null,
        mime_type: dbData.mime_type ?? null,
        uploadedFileSize: dbData.file_size ?? null,
        file_size: dbData.file_size ?? null,
        issuedAt: dbData.issuedAt ?? null,
        expiredAt: dbData.expiredAt ?? null,
        createdAt: dbData.created_at ?? null,
        updatedAt: dbData.updated_at ?? null,
        ledgerData: result.ledgerData ?? null,
      },
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal memverifikasi ijazah.",
      },
      { status: 500 }
    )
  }
}