import { requireAdminSession } from '@/lib/auth/session';
import BulkUploadForm from './bulk-upload-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BulkUploadPage() {
  const session = await requireAdminSession();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <BulkUploadForm session={session} />
    </div>
  );
}
