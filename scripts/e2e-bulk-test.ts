import ExcelJS from 'exceljs';
import axios from 'axios';
import FormData from 'form-data';

const API_BASE = 'http://localhost:3000';

async function runBulkE2ETest() {
  console.log('--- 1. Login ---');
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    identifier: 'admin',
    password: 'admin123',
  });
  const token = loginRes.data.data.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('Logged in successfully as admin.');

  console.log('--- 2. Create Bulk Job ---');
  const createJobRes = await axios.post(`${API_BASE}/api/bulk-jobs`, {}, { headers: authHeaders });
  const jobId = createJobRes.data.data.jobId;
  console.log('Created Bulk Job:', jobId);

  console.log('--- 3. Generate Excel Manifest ---');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Manifest');

  sheet.addRow([
    'certificateNumber',
    'certificateType',
    'degreeTitle',
    'studentId',
    'studentName',
    'faculty',
    'studyProgram',
    'educationLevel',
    'issuedAt',
    'graduationDate',
    'pdf_file_name',
  ]);

  const timestamp = Date.now();
  const cert1 = `BULK-E2E-${timestamp}-1`;
  const cert2 = `BULK-E2E-${timestamp}-2`;
  const pdf1Name = `${cert1}.pdf`;
  const pdf2Name = `${cert2}.pdf`;

  sheet.addRow([
    cert1,
    'IJAZAH',
    'Sarjana Komputer',
    'NIM-BULK-1',
    'Siswa Bulk One',
    'Fakultas Teknik',
    'Teknik Komputer',
    'S1',
    '2026-07-21',
    '2026-07-20',
    pdf1Name,
  ]);

  sheet.addRow([
    cert2,
    'IJAZAH',
    'Sarjana Komputer',
    'NIM-BULK-2',
    'Siswa Bulk Two',
    'Fakultas Teknik',
    'Teknik Informatika',
    'S1',
    '2026-07-21',
    '2026-07-20',
    pdf2Name,
  ]);

  const excelBuffer = (await workbook.xlsx.writeBuffer()) as Buffer;

  console.log('--- 4. Upload Manifest ---');
  const form = new FormData();
  form.append('manifest', excelBuffer, { filename: 'bulk_manifest.xlsx' });

  const manifestRes = await axios.post(`${API_BASE}/api/bulk-jobs/${jobId}/manifest`, form, {
    headers: { ...authHeaders, ...form.getHeaders() },
  });
  console.log('Manifest uploaded. Valid rows:', manifestRes.data.data.validation.validRowsCount);

  console.log('--- 5. Request Presigned Upload URLs ---');
  const urlsRes = await axios.post(
    `${API_BASE}/api/bulk-jobs/${jobId}/upload-urls`,
    { pdfFileNames: [pdf1Name, pdf2Name] },
    { headers: authHeaders }
  );
  const urls: Array<{ pdfFileName: string; uploadUrl: string }> = urlsRes.data.data.urls;
  console.log('Received presigned URLs:', urls.length);

  console.log('--- 6. Upload PDFs to Staging (MinIO) ---');
  const pdf1Buffer = Buffer.from(`PDF content for ${cert1}`);
  const pdf2Buffer = Buffer.from(`PDF content for ${cert2}`);

  const item1Url = urls.find((u) => u.pdfFileName === pdf1Name)!.uploadUrl;
  const item2Url = urls.find((u) => u.pdfFileName === pdf2Name)!.uploadUrl;

  await axios.put(item1Url, pdf1Buffer, { headers: { 'Content-Type': 'application/pdf' } });
  await axios.put(item2Url, pdf2Buffer, { headers: { 'Content-Type': 'application/pdf' } });
  console.log('Uploaded PDF files to MinIO staging successfully.');

  console.log('--- 7. Complete File Upload ---');
  await axios.post(`${API_BASE}/api/bulk-jobs/${jobId}/complete-upload`, {}, { headers: authHeaders });

  console.log('--- 8. Start Bulk Processing (BullMQ Worker) ---');
  const startRes = await axios.post(`${API_BASE}/api/bulk-jobs/${jobId}/start`, {}, { headers: authHeaders });
  console.log('Job enqueued:', startRes.data.data);

  console.log('--- 9. Monitor Job Status ---');
  let jobStatus = 'PROCESSING';
  let attempts = 0;

  while (jobStatus === 'PROCESSING' || jobStatus === 'READY' || jobStatus === 'UPLOADING') {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await axios.get(`${API_BASE}/api/bulk-jobs/${jobId}`, { headers: authHeaders });
    const jobData = statusRes.data.data;
    jobStatus = jobData.status;
    console.log(`Job Status: ${jobStatus} | Processed: ${jobData.processedItems}/${jobData.totalItems} | Failed: ${jobData.failedItems}`);

    if (attempts++ > 15) {
      throw new Error('Timeout waiting for job completion');
    }
  }

  console.log('--- 10. Verify Completed Items ---');
  const itemsRes = await axios.get(`${API_BASE}/api/bulk-jobs/${jobId}/items`, { headers: authHeaders });
  console.log('Bulk Items Result:', itemsRes.data.data);

  console.log('--- 11. Public Verification of Bulk Certificate 1 ---');
  const verifyRes = await axios.get(`${API_BASE}/api/verify/${cert1}`);
  console.log('Public Verification Result for Certificate 1:', verifyRes.data);

  if (verifyRes.data.valid && verifyRes.data.ledgerData.status === 'ACTIVE') {
    console.log('\n========================================');
    console.log('🎉 BULK UPLOAD E2E TEST PASSED PERFECTLY!');
    console.log('========================================\n');
  } else {
    console.error('❌ Verification failed!');
    process.exit(1);
  }
}

runBulkE2ETest().catch((err) => {
  console.error('E2E Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
