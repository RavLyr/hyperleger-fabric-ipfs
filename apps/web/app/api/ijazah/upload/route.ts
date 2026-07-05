import { NextRequest, NextResponse } from "next/server"
import { uploadCertificate } from "@/lib/backend-api/certificates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getText(formData: FormData, ...keys: string[]) {
  for (const key of keys) {
    const value = formData.get(key)

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return ""
}

function isValidUploadedFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const file =
      formData.get("file_ijazah") ??
      formData.get("file") ??
      formData.get("certificateFile") ??
      formData.get("documentFile")

    if (!isValidUploadedFile(file)) {
      return NextResponse.json(
        {
          success: false,
          message: "File ijazah PDF wajib diunggah.",
        },
        { status: 400 }
      )
    }

    const certificateNumber = getText(
      formData,
      "certificateNumber",
      "diplomaNumber",
      "nomorIjazah"
    )

    const issuerId = getText(formData, "issuerId")
    const organizationName = getText(formData, "organizationName")
    const departmentName = getText(formData, "departmentName")
    const mspId = getText(formData, "mspId")

    const certificateType = getText(formData, "certificateType")

    const degreeTitle = getText(formData, "degreeTitle", "title")

    const studentId = getText(formData, "studentId", "nim")
    const studentName = getText(formData, "studentName")
    const studyProgram = getText(formData, "studyProgram")
    const educationLevel = getText(formData, "educationLevel")

    const issuedAt = getText(formData, "issuedAt")
    const graduationDate = getText(formData, "graduationDate")
    const expiredAt = getText(formData, "expiredAt")

    if (
      !certificateNumber ||
      !issuerId ||
      !organizationName ||
      !departmentName ||
      !mspId ||
      !certificateType ||
      !degreeTitle ||
      !studentId ||
      !studentName ||
      !studyProgram ||
      !educationLevel ||
      !issuedAt
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Data upload ijazah belum lengkap. Field wajib: file, certificateNumber, issuerId, organizationName, departmentName, mspId, certificateType, degreeTitle, studentId, studentName, studyProgram, educationLevel, issuedAt.",
        },
        { status: 400 }
      )
    }

    const uploaded = await uploadCertificate({
      file,
      certificateNumber,

      issuerId,
      organizationName,
      departmentName,
      mspId,

      certificateType,
      degreeTitle,

      studentId,
      studentName,
      studyProgram,
      educationLevel,

      issuedAt,
      graduationDate: graduationDate || undefined,
      expiredAt: expiredAt || undefined,
    })

    return NextResponse.json({
      success: true,
      message: "Ijazah berhasil diunggah.",
      data: uploaded,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengunggah ijazah.",
      },
      { status: 500 }
    )
  }
}