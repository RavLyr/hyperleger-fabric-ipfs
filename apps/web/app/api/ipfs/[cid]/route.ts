import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type IpfsRouteProps = {
  params: Promise<{
    cid: string
  }>
}

function getIpfsGatewayUrl() {
  const gatewayUrl = process.env.IPFS_GATEWAY_URL

  if (!gatewayUrl) {
    throw new Error("IPFS_GATEWAY_URL is not set.")
  }

  return gatewayUrl.replace(/\/$/, "")
}

function isValidCid(cid: string) {
  return /^[a-zA-Z0-9]+$/.test(cid)
}

export async function GET(_request: NextRequest, { params }: IpfsRouteProps) {
  try {
    const { cid } = await params
    const decodedCid = decodeURIComponent(cid).trim()

    if (!decodedCid || !isValidCid(decodedCid)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid CID.",
        },
        { status: 400 }
      )
    }

    const ipfsUrl = `${getIpfsGatewayUrl()}/ipfs/${decodedCid}`

    const response = await fetch(ipfsUrl, {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok || !response.body) {
      return NextResponse.json(
        {
          success: false,
          message: "IPFS document cannot be accessed.",
          gatewayStatus: response.status,
        },
        { status: response.status || 502 }
      )
    }

    const headers = new Headers()

    headers.set(
      "Content-Type",
      response.headers.get("Content-Type") ?? "application/pdf"
    )

    headers.set(
      "Content-Disposition",
      `inline; filename="certificate-${decodedCid}.pdf"`
    )

    headers.set("Cache-Control", "no-store")

    const contentLength = response.headers.get("Content-Length")

    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }

    return new NextResponse(response.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch IPFS document.",
      },
      { status: 500 }
    )
  }
}