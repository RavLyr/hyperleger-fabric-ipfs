import { redirect } from "next/navigation"

type ShortQrPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function ShortQrPage({ params }: ShortQrPageProps) {
  const { id } = await params

  redirect(`/ijazah/${encodeURIComponent(id)}/qr`)
}
