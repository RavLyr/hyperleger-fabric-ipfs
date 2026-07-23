# QA Test Report - Verifikasi Ijazah Blockchain/IPFS

Tanggal eksekusi: 2026-07-13  
Lingkungan: local Docker runtime (`backend:3000`, `ipfs:8081`, `postgres:5433`, Fabric network aktif)  
Scope: pengujian API/backend non-browser. Kategori yang perlu interaksi halaman browser tidak dijalankan.

## Ringkasan

| Skenario | Status | Catatan singkat |
|---|---:|---|
| 1. Verifikasi ijazah valid/aktif | PASS | Upload QA valid, verify publik `valid=true`, ledger `ACTIVE`, IPFS file dapat diakses. |
| 2. Nomor ijazah tidak terdaftar | PASS | API mengembalikan `valid=false`, message `Certificate not found in database`. |
| 3. Ijazah revoked + audit trail | PASS | Revoke berhasil, verify menjadi `valid=false`, ledger `REVOKED`, history berisi ACTIVE dan REVOKED. |
| 4. Data ada di Ledger, tidak ada di PostgreSQL | FAIL | Tidak ada auto-recovery; verify publik berhenti di DB dan mengembalikan not found. |
| 5. Data ada di PostgreSQL, tidak ada di Ledger | PARTIAL FAIL | API mendeteksi ledger not found, tetapi tidak menandai eksplisit sebagai indikasi manipulasi/ilegal. |
| 6. Data ada di PostgreSQL dan Ledger, CID tidak ada di IPFS | PARTIAL FAIL | Data teks tervalidasi, tetapi API tetap mengembalikan `documentUrl` tanpa menandai file not found. Gateway IPFS gagal. |
| 7. Unauthorized revoke/upload | PARTIAL FAIL | Tanpa token: `401`, bukan expected `403`. Token valid tapi issuer mismatch: `403`. |
| 9. Upload non-PDF | PARTIAL FAIL | File ditolak, tetapi status HTTP `500`, bukan validasi `4xx`. |
| 10. Upload PDF >10MB | PARTIAL FAIL | File ditolak, tetapi status HTTP `500`, bukan validasi `4xx`. |
| 11. Stress/concurrency verify | PASS | 100/500/1000 request paralel sukses 100%, p95 masing-masing 260ms/1243ms/1837ms. |

## Detail Eksekusi

### Setup dan Sanity Check

- `docker ps`: backend, Postgres, IPFS, Fabric peer/orderer, dan chaincode container aktif.
- `GET /health`:

```json
{"status":"ok","success":true,"message":"Server is running"}
```

- Unit test backend:

```text
tests 11
pass 11
fail 0
```

Catatan setup: `pnpm --dir apps/api test` awalnya gagal karena Prisma client belum di-generate. Setelah `pnpm --dir apps/api prisma:generate`, test lulus.

### Skenario 1 - Valid dan Aktif

Data QA:

- `certificateNumber`: `QA-35a77d41`
- `certificateId`: `5f12b3e0-f815-4d58-93b9-865568502f1a`
- `ipfsCid`: `bafkreihlahkppoadcrp4r3ublvvqrf7p3uurfg66wtwk5kdcfsojzailxe`

Upload:

```json
{"success":true,"message":"Certificate uploaded successfully","data":{"certificateNumber":"QA-35a77d41","status":"VALID"}}
```

Verify sebelum revoke:

```json
{"success":true,"valid":true,"message":"certificate is valid","ledgerData":{"status":"ACTIVE","revoked":false,"tampered":false}}
```

IPFS gateway:

```text
GET /ipfs/bafkreihlahkppoadcrp4r3ublvvqrf7p3uurfg66wtwk5kdcfsojzailxe -> HTTP 200, 38 bytes
```

### Skenario 2 - Nomor Tidak Terdaftar

Request:

```text
GET /api/verify/QA-NOT-REGISTERED-20260713
```

Response:

```json
{"success":true,"valid":false,"message":"Certificate not found in database","data":null}
```

### Skenario 3 - Revoked dan Audit Trail

Revoke:

```json
{"success":true,"message":"Certificate revoked successfully","data":{"certificate":{"certificateNumber":"QA-35a77d41","status":"REVOKED"}}}
```

Verify setelah revoke:

```json
{"success":true,"valid":false,"message":"certificate has been revoked","ledgerData":{"status":"REVOKED","revoked":true,"tampered":false},"documentUrl":null}
```

Revocation info:

```json
{"success":true,"data":{"revocationId":"REVOKE_5f12b3e0-f815-4d58-93b9-865568502f1a","revokedBy":"UNDIP","revokedAt":"2026-07-13T18:13:00.000Z"}}
```

History:

```text
GET /api/certificates/5f12b3e0-f815-4d58-93b9-865568502f1a/history
```

Hasil berisi 2 entry ledger: state awal `ACTIVE`, lalu state `REVOKED`.

### Skenario 4 - Ledger Ada, PostgreSQL Tidak Ada

Dibuat sertifikat ledger-only:

```json
{"success":true,"message":"Certificate issued successfully","data":{"certificateId":"QA-LEDGERONLY-35a77d41","fabricResult":null}}
```

Verify publik:

```json
{"success":true,"valid":false,"message":"Certificate not found in database","data":null}
```

Temuan: endpoint verify mencari PostgreSQL lebih dulu dan tidak melakukan fallback lookup/sync dari ledger. Auto-recovery belum tersedia.

### Skenario 5 - PostgreSQL Ada, Ledger Tidak Ada

Metode: insert row QA sementara langsung ke PostgreSQL, verify, lalu cleanup.

Verify response:

```json
{"success":true,"valid":false,"message":"certificate not found","ledgerData":{"valid":false,"message":"certificate not found"},"documentUrl":null}
```

Cleanup:

```text
DELETE 1
```

Temuan: mismatch terdeteksi sebagai `valid=false`, tetapi respons belum memberi status khusus seperti `MANIPULATION_SUSPECTED`, `ILLEGAL_DATA`, atau pesan eksplisit bahwa PostgreSQL tidak dipercaya karena ledger adalah single source of truth.

### Skenario 6 - CID Tidak Ada di IPFS

Metode: gunakan data ledger + PostgreSQL yang cocok dengan CID palsu, verify, lalu akses gateway IPFS.

Verify response:

```json
{"success":true,"valid":true,"message":"certificate is valid","ledgerData":{"status":"ACTIVE","tampered":false},"documentUrl":"http://134.122.125.198:8081/ipfs/bafkreifakelonly35a77d41"}
```

Gateway IPFS:

```text
HTTP 400
invalid cid: illegal base32 data
```

Temuan: data teks tervalidasi, tetapi API verify tidak mengecek ketersediaan file IPFS dan tidak memunculkan error file/document not found.

### Skenario 7 - Unauthorized Access

Tanpa token:

```text
POST /api/certificates/QA-NOAUTH/revoke -> 401
POST /api/upload -> 401
```

Body revoke:

```json
{"success":false,"error":{"message":"Authorization header is required"}}
```

Token valid, tetapi upload untuk issuer lain:

```text
POST /api/upload issuerId=OTHER -> 403
```

Body:

```json
{"success":false,"error":{"message":"You can only upload certificates for your own issuer"}}
```

Temuan: kontrol akses aktif. Ekspektasi skenario menyebut `403 Forbidden` untuk pengguna tanpa hak akses; implementasi membedakan unauthenticated sebagai `401`, forbidden sebagai `403`.

### Skenario 9 - Upload Selain PDF

Request: upload `.docx` dengan mimetype Word.

```text
HTTP 500
```

Body:

```json
{"success":false,"error":{"message":"Only PDF files are allowed"}}
```

Temuan: validasi file bekerja, tetapi status code sebaiknya `400 Bad Request` atau `415 Unsupported Media Type`, bukan `500`.

### Skenario 10 - Upload PDF >10MB

Request: upload file PDF 11 MiB.

```text
HTTP 500
```

Body:

```json
{"success":false,"error":{"message":"File too large"}}
```

Temuan: limit 10MB bekerja, tetapi status code sebaiknya `413 Payload Too Large`, bukan `500`.

### Skenario 11 - Stress Testing

Target:

```text
GET /api/verify/QA-NOT-REGISTERED-20260713
```

Hasil:

| Concurrency | OK | Failed | Total | Min | P50 | P95 | Max |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 | 100 | 0 | 292ms | 205ms | 244ms | 260ms | 281ms |
| 500 | 500 | 0 | 1360ms | 174ms | 806ms | 1243ms | 1253ms |
| 1000 | 1000 | 0 | 2079ms | 417ms | 1038ms | 1837ms | 1931ms |

Catatan: test ini memakai nomor tidak terdaftar, jadi mengukur jalur API + PostgreSQL lookup ringan. Jalur valid certificate yang menyentuh Fabric akan lebih mahal dan perlu load test terpisah dengan dataset aktif.

## Temuan Prioritas

1. Auto-recovery Ledger -> PostgreSQL belum ada. Skenario 4 gagal.
2. Mismatch PostgreSQL-only belum diklasifikasikan sebagai indikasi manipulasi/ilegal. Skenario 5 hanya `valid=false`.
3. Verify tidak mengecek file IPFS. Skenario 6 belum memberi error file not found pada dokumen fisik.
4. Error validasi upload dari Multer masih menjadi HTTP 500. Ubah mapping error menjadi `400/413/415`.
5. Ekspektasi keamanan perlu dipertegas: unauthenticated lazimnya `401`, authenticated-but-forbidden `403`. Jika requirement tetap wajib `403` untuk tanpa token, middleware perlu disesuaikan.



## Update Setelah Fix - 2026-07-13

Branch: `fix/qa-hardening`  
Baseline aman: tag `v0.1.0-qa-baseline`

### Hasil Verifikasi Terbaru

Command:

```bash
pnpm --dir apps/api typecheck
pnpm --dir apps/api test
pnpm qa:test
```

Hasil:

- Typecheck backend: PASS
- Unit test backend: PASS, 15 test
- QA API/integration runner: PASS 20, FAIL 0
- Backend Docker direbuild dan berjalan sehat di `http://localhost:3000/health`

### Status Skenario Setelah Fix

| Skenario | Status Baru | Bukti Ringkas |
|---|---:|---|
| 1. Verifikasi ijazah valid/aktif | PASS | Upload valid, verify `valid=true`, IPFS HTTP 200. |
| 2. Nomor ijazah tidak terdaftar | PASS | `Certificate not found in database or ledger`. |
| 3. Revoked + audit trail | PASS | Verify `REVOKED`, history 2 entries. |
| 4. Ledger ada, PostgreSQL kosong | PASS | Auto-recovery membuat DB metadata minimal lalu verify valid. |
| 5. PostgreSQL ada, Ledger kosong | PASS | Response eksplisit: possible manipulation/illegal data. |
| 6. CID tidak ada di IPFS | PASS | Data teks tetap valid, `documentStatus=FILE_NOT_FOUND`, `documentUrl=null`. |
| 7. Unauthorized access | PASS | Tanpa token `401`; issuer mismatch `403`. |
| 9. Upload non-PDF | PASS | HTTP `415`. |
| 10. Upload PDF >10MB | PASS | HTTP `413`. |
| 11. Stress 100/500/1000 | PASS | 1000 concurrent: ok=1000 failed=0 p95=2658ms total=3385ms. |

Catatan auth: implementasi mempertahankan semantik standar HTTP: `401 Unauthorized` untuk tanpa token, `403 Forbidden` untuk token valid tanpa hak akses.
