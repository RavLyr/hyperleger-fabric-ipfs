export type BackendResponse<T> = {
  success?: boolean
  message?: string
  data?: T
  error?: {
    message?: string
  }
}

export type HealthResponse = {
  status: string
  success: boolean
  message: string
}

export type CertificateStatus =
  | "VALID"
  | "ACTIVE"
  | "REVOKED"
  | "REISSUED"
  | "EXPIRED"
  | "UNKNOWN"

export type IssuerData = {
  issuerId: string
  organizationName: string
  departmentName: string
  mspId: string
  status: string
}

export type DatabaseCertificate = {
  id: number
  certificateId: string
  certificateNumber: string
  issuerId: string
  certificateType: string
  degreeTitle: string
  studentId: string
  studentName: string
  organizationName?: string | null
  universityName?: string | null
  faculty?: string | null
  studyProgram: string
  educationLevel: string
  graduationDate?: string | null
  ipfsCid: string
  file_name?: string | null
  mime_type?: string | null
  file_size?: number | null
  ledger_tx_id?: string | null
  status: CertificateStatus | string
  issuedAt?: string | null
  created_at?: string | null
  updated_at?: string | null
  title?: string | null
  studentIdHash?: string | null
  documentHash?: string | null
  expiredAt?: string | null
  previousCertificateId?: string | null
  replacementCertificateId?: string | null
}

export type LedgerCertificateAsset = {
  docType?: string | null
  certificateId: string
  certificateNumber: string
  studentIdHash?: string | null
  issuerId: string
  certificateType: string
  title: string
  degreeTitle?: string | null
  ipfsCid: string
  status: CertificateStatus | string
  issuedAt?: string | null
  expiredAt?: string | null
  previousCertificateId?: string | null
  replacementCertificateId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type LedgerVerifyResult = {
  certificateId: string
  valid: boolean
  status: CertificateStatus | string
  issuerId: string
  certificateType: string
  message: string
  issuedAt?: string
  revoked: boolean
  tampered: boolean
}

export type VerifyCertificateResponse = {
  success: boolean
  valid: boolean
  message?: string
  ledgerData?: LedgerVerifyResult | null
  dbData?: DatabaseCertificate | null
  documentUrl?: string | null
}

export type UploadCertificateInput = {
  file: File
  certificateNumber: string
  issuerId: string
  organizationName: string
  departmentName: string
  mspId: string
  certificateType: string
  degreeTitle: string
  studentId: string
  studentName: string
  faculty?: string
  studyProgram: string
  educationLevel: string
  issuedAt: string
  graduationDate?: string
  expiredAt?: string
}

export type IssueCertificateInput = {
  certificateId?: string
  certificateNumber: string
  studentId?: string
  studentIdHash?: string
  issuerId: string
  certificateType: string
  degreeTitle: string
  ipfsCid: string
  issuedAt: string
  expiredAt?: string
}

export type RegisterIssuerInput = {
  issuerId: string
  organizationName: string
  departmentName: string
  mspId: string
}

export type RevocationData = {
  certificateId: string
  reasonHash: string
  revokedAt: string
}

export type CertificateHistoryItem = {
  txId: string
  timestamp: string
  isDelete: boolean
  value: LedgerCertificateAsset
}

export type FabricHealthResponse = {
  success: boolean
  data: {
    status: "connected" | "degraded" | string
    itemCount?: number | null
  }
}

export type FabricInvokeInput = {
  functionName: string
  args?: string[]
  mode?: "evaluate" | "submit"
}

export type FabricInvokeResponse = {
  success: boolean
  data: {
    mode: "evaluate" | "submit" | string
    result: unknown
  }
}

export type AuthIssuerData = {
  issuerId: string
  organizationName: string
  departmentName: string
  mspId: string
  username?: string
  email?: string
  isActive?: boolean
  status?: string
}

export type LoginInput = {
  identifier: string
  password: string
}

export type LoginResponse = {
  success: boolean
  data: {
    accessToken: string
    issuer: AuthIssuerData
  }
}

export type RegisterIssuerAdminInput = {
  issuerId: string
  organizationName: string
  departmentName: string
  mspId: string
  username: string
  email: string
  password: string
}

export type BulkJobStatus =
  | "CREATED"
  | "UPLOADING"
  | "VALIDATING"
  | "READY"
  | "PROCESSING"
  | "COMPLETED"
  | "COMPLETED_WITH_ERRORS"
  | "FAILED"
  | "CANCELLED"

export type BulkItemStatus =
  | "PENDING"
  | "VALIDATED"
  | "STAGED"
  | "IPFS_UPLOADED"
  | "FABRIC_COMMITTED"
  | "DB_PERSISTED"
  | "COMPLETED"
  | "FAILED"

export type BulkUploadJobData = {
  id: number
  jobId: string
  issuerId: string
  status: BulkJobStatus
  totalItems: number
  processedItems: number
  failedItems: number
  manifestPath?: string | null
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
}

export type BulkUploadItemData = {
  id: number
  itemId: string
  jobId: string
  certificateNumber: string
  pdfFileName: string
  metadata: Record<string, unknown>
  status: BulkItemStatus
  attempts: number
  errorMessage?: string | null
  stagedObjectKey?: string | null
  ipfsCid?: string | null
  ledgerTxId?: string | null
  createdAt: string
  updatedAt: string
}

export type ManifestValidationResult = {
  totalRows: number
  validRowsCount: number
  invalidRows: Array<{
    rowNumber: number
    error: string
  }>
}

export type UploadPresignedUrlItem = {
  itemId: string
  pdfFileName: string
  stagedObjectKey: string
  uploadUrl: string
}
