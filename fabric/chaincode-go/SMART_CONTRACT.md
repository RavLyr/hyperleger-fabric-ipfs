# Ijazah Smart Contract Technical Documentation

Dokumen ini menjelaskan spesifikasi teknis, model data, metode API, serta best practice dokumentasi untuk smart contract **Ijazah** yang berjalan di Hyperledger Fabric.

---

## 1. Arsitektur Data Model (Assets & Records)

Smart contract ini mengelola tiga jenis dokumen utama di World State:

### A. IssuerAsset (`docType: issuer`)
Merepresentasikan institusi penerbit sertifikat (seperti Universitas atau Fakultas).
* **Key Format:** `ISSUER_{issuerID}`
* **Fields:**
  | Field Name | Type | Description |
  | :--- | :--- | :--- |
  | `docType` | string | Nilai tetap: `"issuer"`. |
  | `issuerId` | string | ID unik dari issuer (Primary Key). |
  | `organizationName` | string | Nama Universitas/Organisasi. |
  | `departmentName` | string | Nama Fakultas/Jurusan. |
  | `mspId` | string | MSP ID dari organisasi pemilik issuer (misal: `"Org1MSP"`). |
  | `status` | string | Status keaktifan: `"ACTIVE"` atau `"INACTIVE"`. |
  | `registeredAt` | string | Timestamp waktu registrasi (format RFC3339). |
  | `updatedAt` | string | Timestamp waktu update terakhir (format RFC3339). |

### B. CertificateAsset (`docType: certificate`)
Merepresentasikan ijazah/sertifikat akademik mahasiswa.
* **Key Format:** `CERT_{certificateID}`
* **Fields:**
  | Field Name | Type | Description |
  | :--- | :--- | :--- |
  | `docType` | string | Nilai tetap: `"certificate"`. |
  | `certificateId` | string | ID unik sertifikat (Primary Key). |
  | `certificateNumber` | string | Nomor Ijazah resmi dari institusi. |
  | `studentIdHash` | string | Hash dari ID/NIM mahasiswa untuk menjaga privasi. |
  | `issuerId` | string | ID dari Issuer yang menerbitkan sertifikat. |
  | `certificateType` | string | Jenis jenjang (misal: `"Sarjana"`, `"Magister"`). |
  | `title` | string | Gelar akademik (misal: `"Sarjana Komputer"`). |
  | `documentHash` | string | Hash SHA-256 berkas ijazah PDF asli (untuk verifikasi keaslian). |
  | `ipfsCid` | string | CID IPFS tempat menyimpan file ijazah terenkripsi. |
  | `status` | string | Status: `"ACTIVE"`, `"REVOKED"`, `"REISSUED"`, `"EXPIRED"`. |
  | `issuedAt` | string | Tanggal terbit sertifikat. |
  | `expiredAt` | string (optional) | Tanggal kadaluarsa (jika ada). |
  | `previousCertificateId` | string (optional) | ID sertifikat sebelumnya (jika ini reissued). |
  | `replacementCertificateId` | string (optional) | ID sertifikat pengganti (jika ini sudah direissue). |
  | `createdAt` | string | Timestamp waktu pembuatan ledger. |
  | `updatedAt` | string | Timestamp waktu update terakhir. |

### C. RevocationRecord (`docType: revocation`)
Mencatat informasi ketika sebuah ijazah dicabut/dibatalkan.
* **Key Format:** `REVOKE_{certificateID}`
* **Fields:**
  | Field Name | Type | Description |
  | :--- | :--- | :--- |
  | `docType` | string | Nilai tetap: `"revocation"`. |
  | `revocationId` | string | ID unik pencabutan (`REVOKE_{certificateID}`). |
  | `certificateId` | string | ID sertifikat yang dicabut. |
  | `revokedBy` | string | ID issuer yang melakukan pencabutan. |
  | `reasonHash` | string | Hash alasan pencabutan (untuk privasi). |
  | `revokedAt` | string | Tanggal pencabutan dilakukan. |

---

## 2. API Methods Reference (Selain Reissue)

### 1. `InitLedger`
Menginisialisasi ledger state awal (biasanya untuk testing/seed data).
* **Type:** Invoke (Write)
* **Arguments:** `[]`
* **Access Control:** Bebas (Semua anggota channel).

### 2. `RegisterIssuer`
Mendaftarkan institusi penerbit sertifikat baru.
* **Type:** Invoke (Write)
* **Arguments:** `[issuerID, organizationName, departmentName, mspID]`
* **Access Control:** Harus dipanggil oleh Admin dari `mspID` yang didaftarkan (Pemeriksaan client identity MSP ID).
* **Contoh Command:**
  ```bash
  peer chaincode invoke -C appchannel-etcdraft -n ijazah -c '{"Args":["SmartContract:RegisterIssuer", "issuer01", "Universitas Indonesia", "Fakultas Ilmu Komputer", "Org1MSP"]}' ...
  ```

### 3. `GetIssuer`
Mengambil detail informasi institusi penerbit berdasarkan ID.
* **Type:** Query (Read)
* **Arguments:** `[issuerID]`
* **Contoh Command:**
  ```bash
  peer chaincode query -C appchannel-etcdraft -n ijazah -c '{"Args":["SmartContract:GetIssuer", "issuer01"]}'
  ```

### 4. `IssuerExists`
Memeriksa apakah issuer ID sudah terdaftar di ledger.
* **Type:** Query (Read)
* **Arguments:** `[issuerID]`
* **Returns:** boolean (`true`/`false`)

### 5. `IssueCertificate`
Menerbitkan ijazah baru ke dalam ledger.
* **Type:** Invoke (Write)
* **Arguments:** `[certificateID, certificateNumber, studentIDHash, issuerID, certificateType, title, documentHash, ipfsCid, issuedAt, expiredAt]`
* **Access Control:** Client caller MSP ID harus sama dengan `mspId` dari `issuerID` yang bersangkutan.
* **Events Emitted:** `CertificateIssued` (mengembalikan payload JSON `CertificateAsset`).
* **Contoh Command:**
  ```bash
  peer chaincode invoke -C appchannel-etcdraft -n ijazah -c '{"Args":["SmartContract:IssueCertificate", "cert01", "123456", "stud_hash_abc", "issuer01", "Sarjana", "Sarjana Komputer", "doc_hash_xyz", "ipfs_cid_123", "2026-06-24", ""]}' ...
  ```

### 6. `GetCertificate`
Mengambil data detail sertifikat berdasarkan ID.
* **Type:** Query (Read)
* **Arguments:** `[certificateID]`
* **PENTING (Catatan Validasi OpenAPI):** 
  > [!WARNING]
  > Di library `fabric-contract-api-go`, jika field bertipe string dalam struct tidak didefinisikan sebagai pointer (`*string`), schema generator menganggapnya sebagai field **wajib (required)**. 
  > Jika Anda memanggil `GetCertificate` pada ijazah yang tidak memiliki nilai `expiredAt`, `previousCertificateId`, atau `replacementCertificateId` (berupa string kosong `""`), query akan menghasilkan error:
  > `"error handling success response. value did not match schema: return: expiredAt is required"`.
  > **Solusi:** Di sisi client, untuk mengecek keabsahan disarankan menggunakan metode `VerifyCertificate` yang mengembalikan model schema minimalis dan aman dari error validasi OpenAPI. Di masa mendatang, struct Go harus diubah menggunakan pointer string (`*string`) untuk field opsional.

### 7. `CertificateExists`
Memeriksa apakah sertifikat ID sudah ada di ledger.
* **Type:** Query (Read)
* **Arguments:** `[certificateID]`
* **Returns:** boolean (`true`/`false`)

### 8. `VerifyCertificate`
Melakukan verifikasi keabsahan ijazah berdasarkan ID sertifikat dan opsional dokumen hash (SHA-256 PDF asli).
* **Type:** Query (Read)
* **Arguments:** `[certificateID, documentHash]`
* **Returns:** `VerificationResult`
* **Contoh Output Sukses:**
  ```json
  {
    "certificateId": "cert01",
    "valid": true,
    "status": "ACTIVE",
    "issuerId": "issuer01",
    "certificateType": "Sarjana",
    "message": "certificate is valid",
    "issuedAt": "2026-06-24",
    "revoked": false,
    "tampered": false
  }
  ```
* **Contoh Output Tampered (Hash Berkas Berbeda):**
  ```json
  {
    "certificateId": "cert01",
    "valid": false,
    "status": "ACTIVE",
    "issuerId": "issuer01",
    "certificateType": "Sarjana",
    "message": "document hash does not match certificate record",
    "issuedAt": "2026-06-24",
    "revoked": false,
    "tampered": true
  }
  ```

### 9. `RevokeCertificate`
Membatalkan/mencabut ijazah yang sudah terbit (misal karena kecurangan akademik).
* **Type:** Invoke (Write)
* **Arguments:** `[certificateID, reasonHash, revokedAt]`
* **Access Control:** Hanya bisa dipanggil oleh organisasi pemilik `issuerID` dari sertifikat tersebut.
* **Events Emitted:** `CertificateRevoked` (mengembalikan payload JSON `RevocationRecord`).
* **Contoh Command:**
  ```bash
  peer chaincode invoke -C appchannel-etcdraft -n ijazah -c '{"Args":["SmartContract:RevokeCertificate", "cert01", "reason_hash_123", "2026-06-24"]}' ...
  ```

### 10. `GetRevocationInfo`
Mendapatkan informasi detail pencabutan ijazah.
* **Type:** Query (Read)
* **Arguments:** `[certificateID]`
* **Contoh Output:**
  ```json
  {
    "docType": "revocation",
    "revocationId": "REVOKE_cert01",
    "certificateId": "cert01",
    "revokedBy": "issuer01",
    "reasonHash": "reason_hash_123",
    "revokedAt": "2026-06-24"
  }
  ```

### 11. `GetCertificateHistory`
Mendapatkan riwayat audit trail (audit log) lengkap dari perubahan suatu ijazah sejak terbit hingga dicabut atau direissue.
* **Type:** Query (Read)
* **Arguments:** `[certificateID]`
* **Returns:** Array `HistoryRecord` yang berisi `txId`, `timestamp`, `isDelete`, dan JSON value pada versi tersebut.

### 12. `GetAllCertificates` & `GetCertificatesByIssuer`
Mendapatkan semua sertifikat (atau berdasarkan issuer).
* **Type:** Query (Read)
* **Arguments:** `[]` / `[issuerID]`
* **PENTING:** Keduanya rentan terkena error OpenAPI schema validation jika terdapat sertifikat dengan field opsional kosong. Direkomendasikan untuk menonaktifkan response validation pada peer atau mendefinisikan field opsional sebagai pointer string pada smart contract.

---

## 3. Best Practice Dokumentasi Smart Contract

Bagaimana standar industri mendokumentasikan API Smart Contract (khususnya Hyperledger Fabric)?

### A. Di Tingkat Smart Contract (Developer / Chaincode Codebase)
* **Markdown Spec (Rekomendasi Utama):** Seperti dokumen `SMART_CONTRACT.md` ini. Mengapa? Karena smart contract Fabric tidak diakses secara langsung oleh frontend (menggunakan HTTP/REST), melainkan dipanggil secara internal via SDK gRPC oleh Backend API Gateway. Markdown adalah cara paling ringkas bagi developer backend untuk memahami parameter pemanggilan.
* **Metadata OpenAPI (Auto-Generated):** 
  `fabric-contract-api-go` memiliki fitur bawaan untuk mengekspor OpenAPI (Swagger) JSON secara otomatis.
  Saat chaincode di-compile, Anda bisa menjalankan command CLI untuk mengekstrak file skema OpenAPI:
  ```bash
  # Mengambil skema OpenAPI lengkap dari chaincode
  # (Perlu dikonfigurasi di main.go jika menggunakan custom builder/flag)
  ```
  File metadata JSON ini nantinya dapat di-import langsung ke Swagger UI.

### B. Di Tingkat Backend Application / Gateway (Client Facing)
* **Swagger/OpenAPI UI (Sangat Direkomendasikan):** 
  Di production, best practice-nya adalah mendokumentasikan API di layer **Backend API Gateway** (Node.js/Express, Go, atau Java Spring yang menjembatani web frontend ke Fabric Peer via SDK).
  Swagger UI dipasang di backend API tersebut, memetakan rute REST HTTP (misal: `POST /api/v1/certificates/issue`) ke pemanggilan gRPC smart contract (`IssueCertificate`). Ini mempermudah tim Web/Mobile App Developer karena mereka cukup melihat dokumentasi Swagger HTTP biasa tanpa perlu memahami gRPC/Fabric SDK.
