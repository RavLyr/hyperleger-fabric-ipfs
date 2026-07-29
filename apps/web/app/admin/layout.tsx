import type { Metadata } from "next"
import { BulkUploadProvider } from "@/components/providers/bulk-upload-provider"

export const metadata: Metadata = {
  title: "Dashboard Admin",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BulkUploadProvider>
      {children}
    </BulkUploadProvider>
  )
}
