import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

type BackendResponse<T> = {
  success?: boolean
  message?: string
  data?: T
  error?: {
    message?: string
  }
}

function getBackendBaseUrl() {
  const baseUrl = process.env.BACKEND_BASE_URL

  if (!baseUrl) {
    throw new Error("BACKEND_BASE_URL belum diset.")
  }

  return baseUrl.replace(/\/$/, "")
}

function normalizeMspId(value: string) {
  const normalizedValue = value.trim()

  const mspMap: Record<string, string> = {
    org1: "Org1MSP",
    org2: "Org2MSP",
    Org1MSP: "Org1MSP",
    Org2MSP: "Org2MSP",
  }

  return mspMap[normalizedValue] ?? null
}

function normalizeIssuerId(value: string) {
  return value.trim().toUpperCase()
}

async function checkIssuerExistsOnBackend(issuerId: string) {
  const response = await fetch(
    `${getBackendBaseUrl()}/api/issuers/${encodeURIComponent(issuerId)}/exists`,
    {
      method: "GET",
      cache: "no-store",
    }
  )

  const result = (await response.json()) as BackendResponse<boolean>

  if (!response.ok || result.success === false) {
    throw new Error(
      result.error?.message ||
        result.message ||
        "Gagal mengecek issuer."
    )
  }

  return result.data === true
}

async function registerIssuerOnBackend(input: {
  issuerId: string
  organizationName: string
  departmentName: string
  mspId: string
}) {
  const alreadyExists = await checkIssuerExistsOnBackend(input.issuerId)

  if (alreadyExists) {
    return
  }

  const response = await fetch(`${getBackendBaseUrl()}/api/issuers`, {
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
    cache: "no-store",
  })

  const result = (await response.json()) as BackendResponse<string>

  if (!response.ok || result.success === false) {
    throw new Error(
      result.error?.message ||
        result.message ||
        "Gagal mendaftarkan issuer."
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const name = String(body.name ?? "").trim()
    const email = String(body.email ?? "").trim().toLowerCase()
    const password = String(body.password ?? "")
    const confirmPassword = String(body.confirmPassword ?? "")

    const issuerId = normalizeIssuerId(String(body.issuerId ?? ""))
    const organizationName = String(body.organizationName ?? "").trim()
    const departmentName = String(body.departmentName ?? "").trim()
    const rawMspId = String(body.mspId ?? "").trim()
    const mspId = normalizeMspId(rawMspId)

    if (
      !name ||
      !email ||
      !password ||
      !confirmPassword ||
      !issuerId ||
      !organizationName ||
      !departmentName ||
      !rawMspId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Semua field wajib diisi.",
        },
        { status: 400 }
      )
    }

    if (!mspId) {
      return NextResponse.json(
        {
          success: false,
          message: "MSP ID tidak valid. Pilih Org1MSP atau Org2MSP.",
        },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Password minimal 8 karakter.",
        },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Konfirmasi password tidak sama.",
        },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Email sudah terdaftar.",
        },
        { status: 409 }
      )
    }

    const existingIssuer = await prisma.issuer.findUnique({
      where: {
        issuerId,
      },
    })

    if (existingIssuer) {
      return NextResponse.json(
        {
          success: false,
          message: "Issuer ID sudah terdaftar.",
        },
        { status: 409 }
      )
    }

    await registerIssuerOnBackend({
      issuerId,
      organizationName,
      departmentName,
      mspId,
    })

    const passwordHash = await hash(password, 12)

    const result = await prisma.$transaction(async (tx) => {
      const issuer = await tx.issuer.create({
        data: {
          issuerId,
          organizationName,
          departmentName,
          mspId,
          status: "ACTIVE",
        },
      })

      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "ISSUER_ADMIN",
          issuerDbId: issuer.id,
        },
      })

      return {
        issuer,
        user,
      }
    })

    return NextResponse.json(
      {
        success: true,
        message: "Registrasi issuer berhasil.",
        data: {
          issuer: {
            id: result.issuer.id,
            issuerId: result.issuer.issuerId,
            organizationName: result.issuer.organizationName,
            departmentName: result.issuer.departmentName,
            mspId: result.issuer.mspId,
            status: result.issuer.status,
          },
          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat registrasi issuer.",
      },
      { status: 500 }
    )
  }
}