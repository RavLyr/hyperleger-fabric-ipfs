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
  | `ipfsCid` | string | CID IPFS dokumen ijazah. Nilai ini menjadi satu-satunya fingerprint dokumen. |
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

## 2. API Methods Reference

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
* **Arguments:** `[certificateID, certificateNumber, studentIDHash, issuerID, certificateType, title, ipfsCid, issuedAt, expiredAt]`
* **Access Control:** Client caller MSP ID harus sama dengan `mspId` dari `issuerID` yang bersangkutan.
* **Events Emitted:** `CertificateIssued` (mengembalikan payload JSON `CertificateAsset`).
* **Contoh Command:**
  ```bash
  peer chaincode invoke -C appchannel-etcdraft -n ijazah -c '{"Args":["SmartContract:IssueCertificate", "cert01", "123456", "stud_hash_abc", "issuer01", "Sarjana", "Sarjana Komputer", "ipfs_cid_123", "2026-06-24", ""]}' ...
  ```

### 6. `GetCertificate`
Mengambil data detail sertifikat berdasarkan ID.
* **Type:** Query (Read)
* **Arguments:** `[certificateID]`
* **PENTING (Catatan Validasi):** 
  > [!NOTE]
  > **STATUS: AMAN (RESOLVED)**
  > Masalah validasi OpenAPI schema di sisi client ini sekarang sudah aman karena:
  > 1. Aplikasi backend Express saat ini menggunakan SDK `@hyperledger/fabric-gateway` versi baru (v1.x) yang tidak lagi melakukan pemaksaan validasi skema respons (response schema validation) secara ketat di sisi client.
  > 2. Alur verifikasi di backend telah disinkronkan untuk memanggil `VerifyCertificate` yang memiliki model data terstandardisasi dan aman dari resiko kegagalan skema OpenAPI.

### 7. `CertificateExists`
Memeriksa apakah sertifikat ID sudah ada di ledger.
* **Type:** Query (Read)
* **Arguments:** `[certificateID]`
* **Returns:** boolean (`true`/`false`)

### 8. `VerifyCertificate`
Melakukan verifikasi keabsahan ijazah berdasarkan ID sertifikat dan opsional IPFS CID.
* **Type:** Query (Read)
* **Arguments:** `[certificateID, ipfsCid]`
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
* **Contoh Output Tampered (CID Berbeda):**
  ```json
  {
    "certificateId": "cert01",
    "valid": false,
    "status": "ACTIVE",
    "issuerId": "issuer01",
    "certificateType": "Sarjana",
    "message": "IPFS CID does not match certificate record",
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
* **Returns:** JSON string berisi array `CertificateAsset`. Backend `fabric-result.ts` akan men-decode string JSON ini menjadi array JavaScript.
* **Catatan:** Return type dibuat string untuk menghindari masalah schema validation Fabric contract API pada array struct dengan field opsional kosong.

### 13. `ReissueCertificate`
Menerbitkan sertifikat pengganti baru dari sertifikat lama yang aktif (mengubah status sertifikat lama menjadi `REISSUED` dan mengaitkannya dengan sertifikat pengganti yang baru).
* **Type:** Invoke (Write)
* **Arguments:** `[oldCertificateID, newCertificateID, newCertificateNumber, newIpfsCid, reasonHash, reissuedAt]`
* **Access Control:** Hanya bisa dipanggil oleh organisasi pemilik `issuerID` dari sertifikat tersebut.
* **Events Emitted:** `CertificateReissued` (mengembalikan payload JSON `ReissueRecord`).
* **Contoh Command:**
  ```bash
  peer chaincode invoke -C appchannel-etcdraft -n ijazah -c '{"Args":["SmartContract:ReissueCertificate", "cert01", "cert02", "123457", "new_ipfs_cid", "reason_hash", "2026-06-25"]}' ...
  ```


## Current Runtime Definition

Pada runtime lokal terakhir yang sudah diverifikasi:

* Channel: `appchannel-etcdraft`
* Chaincode name: `ijazah`
* Committed version: `4.0`
* Committed sequence: `5`
* Endorsement policy: `OR('Org1MSP.peer','Org2MSP.peer')`
* Document fingerprint: hanya `ipfsCid`, tanpa `documentHash` di API contract.

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
