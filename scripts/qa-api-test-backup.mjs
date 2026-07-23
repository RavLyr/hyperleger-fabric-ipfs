import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const API = process.env.API_BASE_URL ?? 'http://localhost:3000';
const IPFS = process.env.IPFS_GATEWAY_URL ?? 'http://localhost:8081';
const ADMIN_USER = process.env.QA_ADMIN_USER ?? 'admin';
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD ?? 'admin123';
const PG_CONTAINER = process.env.QA_POSTGRES_CONTAINER ?? 'ipfs-hyperledger-backend-postgres-1';
const PG_DB = process.env.QA_POSTGRES_DB ?? 'ipfs_hyperledger_db';
const PG_USER = process.env.QA_POSTGRES_USER ?? 'postgres';
const STRESS_LEVELS = (process.env.QA_STRESS_LEVELS ?? '100,500,1000').split(',').map((value) => Number(value.trim())).filter(Boolean);
const rows = [];

function mark(name, pass, detail = '') {
  rows.push({ name, status: pass ? 'PASS' : 'FAIL', detail });
  console.log((pass ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' | ' + detail : ''));
}

async function request(path, options = {}) {
  const response = await fetch(API + path, options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: response.status, body };
}

function pdfBlob(size = 38) {
  return new Blob([Buffer.concat([Buffer.from('%PDF-1.4\nQA\n'), Buffer.alloc(Math.max(0, size - 17)), Buffer.from('\n%%EOF')])], { type: 'application/pdf' });
}

function form(fields, fileBlob = pdfBlob(), fileName = 'qa.pdf') {
  const body = new FormData();
  body.append('file_ijazah', fileBlob, fileName);
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  return body;
}

function auth(token) { return { Authorization: 'Bearer ' + token }; }
function q(value) { return String(value).replaceAll("'", "''"); }
function psql(sql) { return execFileSync('docker', ['exec', PG_CONTAINER, 'psql', '-U', PG_USER, '-d', PG_DB, '-c', sql], { encoding: 'utf8' }).trim(); }

async function stress(concurrency) {
  const url = API + '/api/verify/QA-NOT-REGISTERED-' + Date.now();
  const started = Date.now();
  const results = await Promise.all(Array.from({ length: concurrency }, async () => {
    const start = performance.now();
    try {
      const response = await fetch(url);
      await response.arrayBuffer();
      return { ok: response.status === 200, ms: performance.now() - start };
    } catch {
      return { ok: false, ms: performance.now() - start };
    }
  }));
  const times = results.map((result) => result.ms).sort((a, b) => a - b);
  const percentile = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))];
  return { ok: results.filter((result) => result.ok).length, failed: results.filter((result) => !result.ok).length, totalMs: Date.now() - started, p95Ms: Math.round(percentile(0.95)) };
}

async function main() {
  console.log('QA API test target: ' + API);
  console.log('Catatan: test ini membuat data QA immutable di Fabric ledger.\n');

  const health = await request('/health');
  mark('Health check', health.status === 200 && health.body?.success === true, 'HTTP ' + health.status);

  const login = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: ADMIN_USER, password: ADMIN_PASSWORD }) });
  const token = login.body?.data?.accessToken;
  const issuer = login.body?.data?.issuer;
  mark('Login admin', Boolean(token && issuer?.issuerId), issuer?.issuerId ?? 'HTTP ' + login.status);
  if (!token || !issuer) throw new Error('Login gagal, test dihentikan.');

  const suffix = randomUUID().slice(0, 8);
  const certNumber = 'QA-' + suffix;
  const fields = {
    certificateNumber: certNumber,
    issuerId: issuer.issuerId,
    organizationName: issuer.organizationName,
    departmentName: issuer.departmentName,
    mspId: issuer.mspId,
    certificateType: 'DIPLOMA',
    degreeTitle: 'Sarjana QA',
    studentId: 'NIM-' + suffix,
    studentName: 'QA Test Student',
    faculty: 'Fakultas Teknik',
    studyProgram: 'Teknik Informatika',
    educationLevel: 'S1',
    issuedAt: '2026-07-13',
  };

  const upload = await request('/api/upload', { method: 'POST', headers: auth(token), body: form(fields) });
  const cert = upload.body?.data;
  mark('Skenario 1a upload valid', upload.status === 201 && upload.body?.success === true, cert?.certificateNumber ?? 'HTTP ' + upload.status);

  const valid = await request('/api/verify/' + certNumber);
  mark('Skenario 1b verify valid aktif', valid.body?.valid === true && valid.body?.ledgerData?.status === 'ACTIVE', valid.body?.message ?? 'HTTP ' + valid.status);

  const ipfsResponse = await fetch(IPFS + '/ipfs/' + cert?.ipfsCid, { redirect: 'follow' }).catch(() => null);
  mark('Skenario 1c file IPFS tersedia', Boolean(ipfsResponse?.ok), ipfsResponse ? 'HTTP ' + ipfsResponse.status : 'network error');

  const missing = await request('/api/verify/QA-NOT-REGISTERED-20260713');
  mark('Skenario 2 nomor tidak terdaftar', missing.body?.valid === false && /not found/i.test(missing.body?.message ?? ''), missing.body?.message);

  const revoke = await request('/api/certificates/' + cert?.certificateId + '/revoke', { method: 'POST', headers: { ...auth(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'QA revoked test', revokedAt: new Date().toISOString() }) });
  mark('Skenario 3a revoke sertifikat', revoke.body?.success === true, revoke.body?.message ?? 'HTTP ' + revoke.status);

  const revoked = await request('/api/verify/' + certNumber);
  mark('Skenario 3b verify revoked', revoked.body?.valid === false && revoked.body?.ledgerData?.status === 'REVOKED', revoked.body?.message ?? 'HTTP ' + revoked.status);

  const history = await request('/api/certificates/' + cert?.certificateId + '/history');
  mark('Skenario 3c audit trail', Array.isArray(history.body?.data) && history.body.data.length >= 2, String(history.body?.data?.length ?? 0) + ' entries');

  const fakeCid = 'bafkreigh2akiscaildcw2m3sex4vhhi4ni4vpr7cc2nlnia5zmf6s5z7si';
  const ledgerOnlyId = 'QA-LEDGERONLY-' + suffix;
  await request('/api/certificates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ certificateId: ledgerOnlyId, certificateNumber: ledgerOnlyId, studentId: 'NIM-LEDGER-' + suffix, issuerId: issuer.issuerId, certificateType: 'DIPLOMA', degreeTitle: 'Sarjana Ledger Only', ipfsCid: fakeCid, issuedAt: '2026-07-13' }) });
  const ledgerOnlyVerify = await request('/api/verify/' + ledgerOnlyId);
  mark('Skenario 4 ledger ada DB kosong auto-recovery', ledgerOnlyVerify.body?.valid === true && Boolean(ledgerOnlyVerify.body?.dbData), ledgerOnlyVerify.body?.message ?? 'HTTP ' + ledgerOnlyVerify.status);
  psql("DELETE FROM certificates WHERE certificate_id = '" + q(ledgerOnlyId) + "';");

  const dbOnlyId = 'QA-DBONLY-' + suffix;
  try {
    psql("INSERT INTO certificates (certificate_id, certificate_number, issuer_id, certificate_type, degree_title, student_id, student_name, organization_name, faculty, study_program, education_level, ipfs_cid, file_name, mime_type, file_size, ledger_tx_id, status, issued_at, created_at, updated_at) VALUES ('" + q(dbOnlyId) + "', '" + q(dbOnlyId) + "', '" + q(issuer.issuerId) + "', 'DIPLOMA', 'Sarjana DB Only', 'NIM-DB-ONLY', 'QA DB Only', '" + q(issuer.organizationName) + "', 'Fakultas Teknik', 'Teknik Informatika', 'S1', 'bafkreidbonly" + q(suffix) + "', 'db-only.pdf', 'application/pdf', 1, 'db-only-tx', 'VALID', '2026-07-13', now(), now());");
    const dbOnlyVerify = await request('/api/verify/' + dbOnlyId);
    mark('Skenario 5 DB ada ledger kosong ditandai manipulasi', dbOnlyVerify.body?.valid === false && /manipul|illegal|ilegal|single source/i.test(JSON.stringify(dbOnlyVerify.body)), dbOnlyVerify.body?.message ?? 'HTTP ' + dbOnlyVerify.status);
  } finally {
    psql("DELETE FROM certificates WHERE certificate_id = '" + q(dbOnlyId) + "';");
  }

  try {
    psql("INSERT INTO certificates (certificate_id, certificate_number, issuer_id, certificate_type, degree_title, student_id, student_name, organization_name, faculty, study_program, education_level, ipfs_cid, file_name, mime_type, file_size, ledger_tx_id, status, issued_at, created_at, updated_at) VALUES ('" + q(ledgerOnlyId) + "', '" + q(ledgerOnlyId) + "', '" + q(issuer.issuerId) + "', 'DIPLOMA', 'Sarjana Missing IPFS', 'NIM-IPFS-MISSING', 'QA Missing IPFS', '" + q(issuer.organizationName) + "', 'Fakultas Teknik', 'Teknik Informatika', 'S1', '" + fakeCid + "', 'missing.pdf', 'application/pdf', 1, 'missing-ipfs-tx', 'VALID', '2026-07-13', now(), now());");
    const missingIpfs = await request('/api/verify/' + ledgerOnlyId);
    mark('Skenario 6 CID hilang diberi error file not found', missingIpfs.body?.valid === true && /file not found|document not found|ipfs.*not found/i.test(JSON.stringify(missingIpfs.body)), missingIpfs.body?.message ?? 'valid=' + missingIpfs.body?.valid);
  } finally {
    psql("DELETE FROM certificates WHERE certificate_id = '" + q(ledgerOnlyId) + "';");
  }

  const noAuthRevoke = await request('/api/certificates/QA-NOAUTH/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'QA unauthorized' }) });
  mark('Skenario 7a revoke tanpa token harus 401', noAuthRevoke.status === 401, 'HTTP ' + noAuthRevoke.status);

  const noAuthUpload = await request('/api/upload', { method: 'POST' });
  mark('Skenario 7b upload tanpa token harus 401', noAuthUpload.status === 401, 'HTTP ' + noAuthUpload.status);

  const mismatchUpload = await request('/api/upload', { method: 'POST', headers: auth(token), body: form({ ...fields, certificateNumber: 'QA-MISMATCH-' + suffix, issuerId: 'OTHER' }) });
  mark('Skenario 7c issuer mismatch forbidden', mismatchUpload.status === 403, 'HTTP ' + mismatchUpload.status);

  const docx = await request('/api/upload', { method: 'POST', headers: auth(token), body: form(fields, new Blob(['not a pdf'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'qa.docx') });
  mark('Skenario 9 non-PDF ditolak validasi 4xx', [400, 415].includes(docx.status), 'HTTP ' + docx.status);

  const large = await request('/api/upload', { method: 'POST', headers: auth(token), body: form(fields, pdfBlob(11 * 1024 * 1024), 'qa-large.pdf') });
  mark('Skenario 10 PDF >10MB ditolak 413', large.status === 413, 'HTTP ' + large.status);

  for (const level of STRESS_LEVELS) {
    const result = await stress(level);
    mark('Skenario 11 stress ' + level + ' concurrent', result.failed === 0, 'ok=' + result.ok + ' failed=' + result.failed + ' p95=' + result.p95Ms + 'ms total=' + result.totalMs + 'ms');
  }

  const failed = rows.filter((row) => row.status === 'FAIL').length;
  const passed = rows.length - failed;
  console.log('\nRingkasan');
  console.table(rows);
  console.log('PASS=' + passed + ' FAIL=' + failed);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('FATAL | ' + error.message);
  process.exitCode = 1;
});

