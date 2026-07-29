import { requireAdminSession } from '@/lib/auth/session';
import BulkUploadForm from './bulk-upload-form';
import AdminShell from "@/components/ui/admin-shell";
import Footer from "@/components/ui/footer";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BulkUploadPage() {
  const session = await requireAdminSession();

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-5xl px-6 py-10 flex-1">
        <BulkUploadForm session={session} />
      </main>
      <Footer />
    </AdminShell>
  );
}
