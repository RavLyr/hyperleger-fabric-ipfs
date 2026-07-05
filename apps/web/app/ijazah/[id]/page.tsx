import { redirect } from "next/navigation"

type PublicCertificatePageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function PublicCertificatePage({
  params,
}: PublicCertificatePageProps) {
  const { id } = await params

  redirect(`/ijazah/${encodeURIComponent(id)}/qr`)
}