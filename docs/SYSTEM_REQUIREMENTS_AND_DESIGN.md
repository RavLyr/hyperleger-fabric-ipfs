# Requirement dan Design Sistem

Repo ini adalah monorepo untuk sistem verifikasi ijazah akademik berbasis
Hyperledger Fabric, IPFS, PostgreSQL, Express API, dan Next.js.

## Requirement Sistem

### 1. Requirement Fungsional

- Issuer atau institusi dapat melakukan registrasi dan login sebagai admin.
- Admin issuer dapat mengunggah file PDF ijazah beserta metadata akademik.
- Sistem menyimpan file ijazah ke IPFS dan mendapatkan CID sebagai fingerprint dokumen.
- Sistem mencatat data inti ijazah ke Hyperledger Fabric.
- Sistem menyimpan metadata lengkap ijazah ke PostgreSQL agar pencarian cepat.
- Publik dapat memverifikasi ijazah berdasarkan nomor ijazah atau QR Code.
- Sistem memvalidasi hasil pencarian database terhadap ledger Fabric secara real time.
- Admin issuer dapat mencabut ijazah miliknya.
- Sistem menyimpan riwayat pencabutan dan audit trail transaksi di ledger.

### 2. Requirement Non-Fungsional

- Data dokumen harus tahan manipulasi dengan CID IPFS yang dicatat di ledger.
- Metadata pencarian harus cepat dengan PostgreSQL.
- Mutasi data ledger harus dibatasi berdasarkan MSP issuer di Hyperledger Fabric.
- Endpoint admin harus dilindungi autentikasi JWT.
- File privat, MSP/TLS key, CA database, ledger state, dan generated certificate tidak boleh dikomit.

### 3. Requirement Teknologi

- Docker dan Docker Compose
- Node.js v20 atau lebih baru
- pnpm
- PostgreSQL
- IPFS Kubo
- Hyperledger Fabric v3.1.4
- Go untuk chaincode

### 4. Environment Utama

- `DATABASE_URL`
- `JWT_SECRET`
- `IPFS_API_URL`
- `IPFS_GATEWAY_URL`
- `PUBLIC_API_URL`
- `FABRIC_CHANNEL_NAME`
- `FABRIC_CHAINCODE_NAME`
- `FABRIC_MSP_ID`
- `FABRIC_PEER_ENDPOINT`
- `FABRIC_TLS_CERT_PATH`
- `FABRIC_CLIENT_CERT_PATH`
- `FABRIC_CLIENT_KEY_PATH`

Default lokal yang dipakai repo:

- Backend API: `http://localhost:3000`
- Web app: `http://localhost:3001`
- IPFS Gateway: `http://localhost:8081`
- PostgreSQL: `localhost:5433`
- Fabric channel: `appchannel-etcdraft`
- Chaincode: `ijazah`
- Docker network Fabric: `fabric_migration_net`

## Design Sistem

### 1. Arsitektur Umum

```text
User / Admin
   |
   v
Next.js Web App
   |
   v
Express Backend API
   |--------> PostgreSQL: metadata, issuer, auth, transaksi
   |--------> IPFS: file PDF ijazah
   |--------> Hyperledger Fabric: CID, status, issuer, audit ledger
```

Sistem menggunakan arsitektur hybrid:

- IPFS menyimpan file PDF ijazah.
- Hyperledger Fabric menyimpan fingerprint dokumen berupa `ipfsCid`, status, issuer, dan audit trail.
- PostgreSQL menyimpan metadata lengkap untuk pencarian cepat dan kebutuhan aplikasi.

### 2. Struktur Repo

```text
apps/web          Next.js frontend
apps/api          Express TypeScript backend
chaincode/basic   Smart contract Hyperledger Fabric
fabric            Compose, config, dan script Fabric
packages/shared   Placeholder shared package
```

### 3. Frontend Web

Lokasi: `apps/web`

Peran:

- Halaman verifikasi publik.
- Scan QR Code.
- Login issuer admin.
- Dashboard admin ijazah.
- Form upload ijazah.
- Detail ijazah, QR, preview, dan revoke.

Web memanggil backend lewat `BACKEND_BASE_URL`. Route admin dilindungi cookie
session yang berisi JWT backend dan data issuer.

### 4. Backend API

Lokasi: `apps/api`

Peran:

- Gateway antara frontend, PostgreSQL, IPFS, dan Hyperledger Fabric.
- Validasi request upload dan revoke.
- Autentikasi issuer dengan JWT.
- Upload file ke IPFS.
- Submit dan evaluate transaksi Fabric Gateway.
- Sinkronisasi status ledger ke database.

Endpoint utama:

- `POST /auth/register`
- `POST /auth/login`
- `POST /api/upload`
- `GET /api/verify/:nomorIjazah`
- `GET /api/certificates`
- `GET /api/certificates/:certificateId`
- `POST /api/certificates/:certificateId/verify`
- `POST /api/certificates/:certificateId/revoke`
- `GET /api/certificates/:certificateId/history`
- `GET /api/fabric/health`

### 5. Database PostgreSQL

Schema utama backend ada di `apps/api/prisma/schema.prisma`.

Model utama:

- `Issuer`
- `Certificate`
- `Revocation`
- `FabricTransaction`

Database dipakai untuk:

- Data akun issuer.
- Metadata lengkap ijazah.
- Pencarian berdasarkan nomor ijazah.
- Status lokal sertifikat.
- Riwayat transaksi Fabric.

### 6. IPFS

IPFS menyimpan file PDF asli.

Alur:

```text
Backend menerima file PDF
 -> upload ke IPFS API
 -> IPFS mengembalikan CID
 -> CID dicatat ke Fabric
 -> CID dan metadata file disimpan ke PostgreSQL
```

CID menjadi fingerprint dokumen. Jika CID saat verifikasi berbeda dari CID di
ledger, smart contract menandai dokumen sebagai tampered.

### 7. Hyperledger Fabric

Smart contract berada di `chaincode/basic`.

Data ledger:

- `IssuerAsset`
- `CertificateAsset`
- `RevocationRecord`

Fungsi chaincode utama:

- `InitLedger`
- `RegisterIssuer`
- `IssueCertificate`
- `VerifyCertificate`
- `RevokeCertificate`
- `GetIssuer`
- `GetCertificate`
- `GetRevocationInfo`
- `GetCertificatesByIssuer`

Kontrol akses Fabric:

- Chaincode memeriksa MSP caller.
- Issuer hanya dapat melakukan mutasi jika MSP caller sama dengan MSP issuer.
- Backend memilih Fabric identity berdasarkan `mspId` issuer.

Runtime lokal terakhir yang terdokumentasi:

- Channel: `appchannel-etcdraft`
- Chaincode name: `ijazah`
- Version: `4.0`
- Sequence: `5`
- Endorsement policy: `OR('Org1MSP.peer','Org2MSP.peer')`

## Alur Sistem

### 1. Alur Upload Ijazah

```text
Admin login
 -> upload PDF dan metadata
 -> backend validasi token issuer
 -> backend upload PDF ke IPFS
 -> IPFS return CID
 -> backend register issuer di Fabric jika belum ada
 -> backend submit IssueCertificate ke Fabric
 -> backend simpan metadata dan txId ke PostgreSQL
 -> web menampilkan QR/detail ijazah
```

### 2. Alur Verifikasi Ijazah

```text
User input nomor ijazah atau scan QR
 -> web call /api/ijazah/search
 -> web meneruskan ke backend /api/verify/:nomorIjazah
 -> backend cari metadata di PostgreSQL
 -> backend verify ke Fabric pakai certificateId dan ipfsCid
 -> backend return status ledger, metadata DB, dan documentUrl IPFS
 -> web menampilkan hasil verifikasi
```

### 3. Alur Revoke Ijazah

```text
Admin issuer login
 -> pilih ijazah miliknya
 -> kirim reason/reasonHash
 -> backend validasi issuer owner
 -> backend submit RevokeCertificate ke Fabric
 -> backend update status PostgreSQL menjadi REVOKED
 -> web menampilkan status dicabut
```

## Catatan Desain

- Status Fabric memakai `ACTIVE`, `REVOKED`, `REISSUED`, dan `EXPIRED`.
- Status database backend memakai `VALID` dan `REVOKED`.
- Web menormalisasi dua model status tersebut saat menampilkan hasil.
- `apps/web/prisma/schema.prisma` masih ada sebagai schema web/local, tetapi alur utama aplikasi saat ini memakai backend API dan schema Prisma di `apps/api`.
- Smart contract memakai `ipfsCid` sebagai satu-satunya fingerprint dokumen; `documentHash` sudah tidak menjadi kontrak utama.
