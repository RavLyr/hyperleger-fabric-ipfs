import { backendFetch } from "./client"
import type {
  CertificateHistoryItem,
  DatabaseCertificate,
  FabricHealthResponse,
  FabricInvokeInput,
  FabricInvokeResponse,
  HealthResponse,
  IssueCertificateInput,
  IssuerData,
  LedgerCertificateAsset,
  LedgerVerifyResult,
  RegisterIssuerInput,
  RevocationData,
  UploadCertificateInput,
  VerifyCertificateResponse,
} from "./types"

export async function getBackendHealth(): Promise<HealthResponse> {
  return backendFetch("/health")
}

export async function registerIssuer(input: RegisterIssuerInput) {
  const response = await backendFetch("/api/issuers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      issuerId: input.issuerId,
      organizationName: input.organizationName,
      departmentName: input.departmentName,
      mspId: input.mspId,
    }),
  })

  return response.data as string
}

export async function getIssuerById(issuerId: string) {
  const response = await backendFetch(
    `/api/issuers/${encodeURIComponent(issuerId)}`
  )

  return response.data as IssuerData
}

export async function checkIssuerExists(issuerId: string) {
  const response = await backendFetch(
    `/api/issuers/${encodeURIComponent(issuerId)}/exists`
  )

  return response.data as boolean
}

export async function getDatabaseCertificates(issuerId?: string) {
  const query = issuerId ? `?issuerId=${encodeURIComponent(issuerId)}` : ""
  const response = await backendFetch(`/api/${query}`)

  return response.data as DatabaseCertificate[]
}

export async function getLedgerCertificates(issuerId?: string) {
  const query = issuerId ? `?issuerId=${encodeURIComponent(issuerId)}` : ""
  const response = await backendFetch(`/api/certificates${query}`)

  return response.data as LedgerCertificateAsset[]
}

export async function getLedgerCertificatesByIssuer(issuerId: string) {
  const response = await backendFetch(
    `/api/issuers/${encodeURIComponent(issuerId)}/certificates`
  )

  return response.data as LedgerCertificateAsset[]
}

export async function issueCertificateDirect(input: IssueCertificateInput) {
  const response = await backendFetch("/api/certificates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      certificateId: input.certificateId,
      certificateNumber: input.certificateNumber,
      studentId: input.studentId,
      studentIdHash: input.studentIdHash,
      issuerId: input.issuerId,
      certificateType: input.certificateType,
      degreeTitle: input.degreeTitle,
      ipfsCid: input.ipfsCid,
      issuedAt: input.issuedAt,
      expiredAt: input.expiredAt,
    }),
  })

  return response.data as string
}

export async function uploadCertificate(input: UploadCertificateInput) {
  const formData = new FormData()

  formData.append("file_ijazah", input.file)
  formData.append("certificateNumber", input.certificateNumber)

  formData.append("issuerId", input.issuerId)
  formData.append("organizationName", input.organizationName)
  formData.append("departmentName", input.departmentName)
  formData.append("mspId", input.mspId)

  formData.append("certificateType", input.certificateType)
  formData.append("degreeTitle", input.degreeTitle)

  formData.append("studentId", input.studentId)
  formData.append("studentName", input.studentName)

  if (input.faculty) {
    formData.append("faculty", input.faculty)
  }

  formData.append("studyProgram", input.studyProgram)
  formData.append("educationLevel", input.educationLevel)

  formData.append("issuedAt", input.issuedAt)

  if (input.graduationDate) {
    formData.append("graduationDate", input.graduationDate)
  }

  if (input.expiredAt) {
    formData.append("expiredAt", input.expiredAt)
  }

  const response = await backendFetch("/api/upload", {
    method: "POST",
    body: formData,
  })

  return response.data as DatabaseCertificate
}

export async function verifyCertificateByNumber(nomorIjazah: string) {
  return backendFetch(
    `/api/verify/${encodeURIComponent(nomorIjazah)}`
  ) as Promise<VerifyCertificateResponse>
}

export async function getLedgerCertificateDetail(certificateId: string) {
  const response = await backendFetch(
    `/api/certificates/${encodeURIComponent(certificateId)}`
  )

  return response.data as LedgerCertificateAsset
}

export async function checkCertificateExists(certificateId: string) {
  const response = await backendFetch(
    `/api/certificates/${encodeURIComponent(certificateId)}/exists`
  )

  return response.data as boolean
}

export async function verifyLedgerCertificate(
  certificateId: string,
  ipfsCid: string
) {
  const response = await backendFetch(
    `/api/certificates/${encodeURIComponent(certificateId)}/verify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ipfsCid }),
    }
  )

  return response.data as LedgerVerifyResult
}

export async function revokeLedgerCertificate(
  certificateId: string,
  reason: string,
  reasonHash: string,
  revokedAt: string
) {
  const response = await backendFetch(
    `/api/certificates/${encodeURIComponent(certificateId)}/revoke`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason,
        reasonHash,
        revokedAt,
      }),
    }
  )

  return response.data as string | null
}

export async function getCertificateRevocation(certificateId: string) {
  const response = await backendFetch(
    `/api/certificates/${encodeURIComponent(certificateId)}/revocation`
  )

  return response.data as RevocationData
}

export async function getCertificateHistory(certificateId: string) {
  const response = await backendFetch(
    `/api/certificates/${encodeURIComponent(certificateId)}/history`
  )

  return response.data as CertificateHistoryItem[]
}

export async function getFabricHealth() {
  return backendFetch("/api/fabric/health") as Promise<FabricHealthResponse>
}

export async function invokeFabric(input: FabricInvokeInput) {
  return backendFetch("/api/fabric/invoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      functionName: input.functionName,
      args: input.args ?? [],
      mode: input.mode ?? "submit",
    }),
  }) as Promise<FabricInvokeResponse>
}