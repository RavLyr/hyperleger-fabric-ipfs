# Docker Compose Fabric Runtime

Compose ini menjalankan runtime Fabric dengan crypto dan ledger yang sudah ada. Tidak ada Fabric CA baru, tidak ada regenerate MSP/TLS, dan tidak ada reset `/var/hyperledger/production`.

## Struktur Config Yang Dipakai

`fabric/config` diperlakukan sebagai template/default saja. Container memakai config node-specific berikut:

- `osn1.example.com` memakai `fabric/config/orderer-config/osnorg1/osn0/orderer.yaml`
- `osn2.example.com` memakai `fabric/config/orderer-config/osnorg1/osn1/orderer.yaml`
- `osn3.example.com` memakai `fabric/config/orderer-config/osnorg1/osn2/orderer.yaml`
- `peer1org1.example.com` memakai `fabric/config/peers/org1peer/peer0/core.yaml`

Di dalam container, masing-masing folder itu dimount ke `/etc/hyperledger/fabric`, lalu `FABRIC_CFG_PATH=/etc/hyperledger/fabric`.

Beberapa nilai tetap dioverride lewat environment karena path lama di YAML adalah path host/relative, dan listen address lama masih `127.0.0.1`. Di container, service harus listen di `0.0.0.0` agar port Docker bisa dipublish.

## Struktur Ledger Yang Dimount

Ledger/state dimount per-service, bukan seluruh `/var/hyperledger/production` ke semua container:

- `osn1.example.com`: `/var/hyperledger/production/orderer/osno`
- `osn2.example.com`: `/var/hyperledger/production/orderer/osn1`
- `osn3.example.com`: `/var/hyperledger/production/orderer/osn2`
- `peer1org1.example.com`: `/var/hyperledger/production/org1/peer0`
- peer snapshot: `/var/hyperledger/production/snapshots/org1/peer0`

Jangan hapus atau reset folder-folder ini kecuali memang ingin reset ledger node tersebut.

## Detected Paths

- Fabric binary/image version: `v3.1.4`
- Orderer org MSP: `organization/ordererOrganizations/ordererOrg1.example.com/msp`
- Orderer MSP ID dari channel config: `OrdererOrg1MSP`
- Orderer nodes:
  - `osn1.example.com:7050`
    - Config: `fabric/config/orderer-config/osnorg1/osn0/orderer.yaml`
    - Ledger: `/var/hyperledger/production/orderer/osno`
    - MSP: `organization/ordererOrganizations/ordererOrg1.example.com/ordering-service-nodes/osn1.ordererOrg1.example.com/msp`
    - TLS cert: `organization/ordererOrganizations/ordererOrg1.example.com/ordering-service-nodes/osn1.ordererOrg1.example.com/tls/signcerts/cert.pem`
    - TLS key: `organization/ordererOrganizations/ordererOrg1.example.com/ordering-service-nodes/osn1.ordererOrg1.example.com/tls/keystore/orderer1-tls-key.pem`
  - `osn2.example.com:8050`
    - Config: `fabric/config/orderer-config/osnorg1/osn1/orderer.yaml`
    - Ledger: `/var/hyperledger/production/orderer/osn1`
    - MSP: `organization/ordererOrganizations/ordererOrg1.example.com/ordering-service-nodes/osn2.ordererOrg1.example.com/msp`
    - TLS cert: `organization/ordererOrganizations/ordererOrg1.example.com/ordering-service-nodes/osn2.ordererOrg1.example.com/tls/signcerts/cert.pem`
    - TLS key: `organization/ordererOrganizations/ordererOrg1.example.com/ordering-service-nodes/osn2.ordererOrg1.example.com/tls/keystore/org1-osn1-key.pem`
  - `osn3.example.com:9050`
    - Config: `fabric/config/orderer-config/osnorg1/osn2/orderer.yaml`
    - Ledger: `/var/hyperledger/production/orderer/osn2`
    - MSP: `organization/ordererOrganizations/ordererOrg1.example.com/ordering-service-nodes/osn3.ordererOrg1.example.com/msp`
    - TLS cert: `organization/ordererOrganizations/ordererOrg1.example.com/ordering-service-nodes/osn3.ordererOrg1.example.com/tls/signcerts/cert.pem`
    - TLS key: `organization/ordererOrganizations/ordererOrg1.example.com/ordering-service-nodes/osn3.ordererOrg1.example.com/tls/keystore/osn2-tls-key.pem`
- Peer MSP ID: `Org1MSP`
- Peer hostname/container: `peer1org1.example.com`
- Peer config: `fabric/config/peers/org1peer/peer0/core.yaml`
- Peer ledger: `/var/hyperledger/production/org1/peer0`
- Peer MSP: `organization/peerOrganizations/org1.example.com/peers/peer1.org1.ravly.com/msp`
- Peer TLS cert: `organization/peerOrganizations/org1.example.com/peers/peer1.org1.ravly.com/tls/signcerts/cert.pem`
- Peer TLS key: `organization/peerOrganizations/org1.example.com/peers/peer1.org1.ravly.com/tls/keystore/peer0-tls-cert.pem`

## Start

```bash
docker compose up -d
```

## Logs

```bash
docker compose logs -f osn1 osn2 osn3 peer1
```

For one service:

```bash
docker compose logs -f peer1
```

## Bootstrapping / Joining Channel (Fresh State)

Jika data ledger pada host dihapus atau Anda memulai dari keadaan bersih (tanpa data di `/var/hyperledger/production`), ikuti langkah-langkah di bawah ini untuk menggabungkan Orderer dan Peer ke channel `appchannel-etcdraft` menggunakan Genesis Block (`genesis_block.pb`).

### 1. Gabungkan Ordering Service Nodes (OSN) ke Channel

Orderer menggunakan API osnadmin untuk join ke channel. Jalankan perintah berikut di CLI container:

**Join OSN1:**
```bash
docker exec cli.example.com bash -c 'osnadmin channel join -c appchannel-etcdraft --config-block /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/genesis_block.pb -o osn1.example.com:9443 --ca-file /var/hyperledger/crypto/ca-deployments/fabric-ca-client/tls-ca/tlsadmin/msp/tlscacerts/tls-localhost-7054.pem --client-cert $ADMIN_TLS_SIGN_CERT --client-key $ADMIN_TLS_PRIVATE_KEY'
```

**Join OSN2:**
```bash
docker exec cli.example.com bash -c 'osnadmin channel join -c appchannel-etcdraft --config-block /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/genesis_block.pb -o osn2.example.com:9543 --ca-file /var/hyperledger/crypto/ca-deployments/fabric-ca-client/tls-ca/tlsadmin/msp/tlscacerts/tls-localhost-7054.pem --client-cert $ADMIN_TLS_SIGN_CERT --client-key $ADMIN_TLS_PRIVATE_KEY'
```

**Join OSN3:**
```bash
docker exec cli.example.com bash -c 'osnadmin channel join -c appchannel-etcdraft --config-block /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/genesis_block.pb -o osn3.example.com:9643 --ca-file /var/hyperledger/crypto/ca-deployments/fabric-ca-client/tls-ca/tlsadmin/msp/tlscacerts/tls-localhost-7054.pem --client-cert $ADMIN_TLS_SIGN_CERT --client-key $ADMIN_TLS_PRIVATE_KEY'
```

### 2. Gabungkan Peer ke Channel

Gunakan peer CLI di dalam container CLI untuk menggabungkan kedua peer ke channel:

**Join Peer 1 (Org1):**
```bash
docker exec cli.example.com bash -c '
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=peer1org1.example.com:7051
export CORE_PEER_MSPCONFIGPATH=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.ravly.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer1.org1.ravly.com/tls/cacerts/localhost-7054.pem
export CORE_PEER_TLS_ENABLED=true

peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/genesis_block.pb
'
```

**Join Peer 2 (Org2):**
```bash
docker exec cli.example.com bash -c '
export CORE_PEER_LOCALMSPID=Org2MSP
export CORE_PEER_ADDRESS=peer2org2.example.com:8051
export CORE_PEER_MSPCONFIGPATH=/var/hyperledger/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.ravly.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/crypto/peerOrganizations/org2.example.com/peers/peer2.org2.ravly.com/tls/cacerts/localhost-8054.pem
export CORE_PEER_TLS_ENABLED=true

peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/genesis_block.pb
'
```

---

## Peer CLI Checks

Run from the workspace root:

```bash
export FABRIC_CFG_PATH=$PWD/fabric/config/peers/org1peer/peer0
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_MSPCONFIGPATH=$PWD/organization/peerOrganizations/org1.example.com/peers/peer1.org1.ravly.com/msp
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_TLS_ROOTCERT_FILE=$PWD/organization/peerOrganizations/org1.example.com/peers/peer1.org1.ravly.com/tls/cacerts/localhost-7054.pem

organization/ca-deployments/bin/peer channel list
```

## Install Chaincode

Package or provide `basic.tar.gz`, then run:

```bash
organization/ca-deployments/bin/peer lifecycle chaincode install basic.tar.gz
```

Peer container mounts `/var/run/docker.sock`, sets `CORE_VM_ENDPOINT=unix:///var/run/docker.sock`, and sets `CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=fabric_migration_net`, so Fabric's default Docker chaincode builder can create build/chaincode containers on the same network as the peer.

## Troubleshooting

Check container status:

```bash
docker compose ps
```

Check peer/orderer logs:

```bash
docker compose logs peer1
docker compose logs osn1
docker compose logs osn2
docker compose logs osn3
```

Check mounted ledger folders:

```bash
ls -la /var/hyperledger/production/orderer/osno
ls -la /var/hyperledger/production/orderer/osn1
ls -la /var/hyperledger/production/orderer/osn2
ls -la /var/hyperledger/production/org1/peer0
```

Check Docker chaincode containers and images:

```bash
docker ps -a
docker images | grep dev-
```

Inspect the compose network used by peer-launched chaincode containers:

```bash
docker network inspect fabric_migration_net
```

If a ledger reset is ever needed, stop first and decide exactly which node ledger path to move aside. Do not delete `/var/hyperledger/production` automatically.

## Deploy / Upgrade Chaincode Ijazah

Kondisi runtime lokal terakhir yang sudah diverifikasi:

- Channel: `appchannel-etcdraft`
- Chaincode: `ijazah`
- Current committed version: `4.0`
- Current committed sequence: `5`
- Current package label: `ijazah_4.0`
- Current package ID: `ijazah_4.0:b240dd76efb654e13a1fb5e7fb3d01e9027e6c46c7182b7107d2a2fd4f65fbcb`
- Endorsement policy: `OR('Org1MSP.peer','Org2MSP.peer')`
- Contract uses `ipfsCid` as the only document fingerprint. Do not pass `documentHash`.

Untuk upgrade berikutnya, naikkan `--sequence` satu angka dari sequence committed terakhir. Jika kode berubah, buat package label baru, misalnya `ijazah_5.0`, install ke dua peer, lalu approve dan commit sequence baru.

### 1. Package Chaincode

```bash
docker exec cli.example.com peer lifecycle chaincode package /opt/chaincode-packages/ijazah_v5.tar.gz \
  --path /opt/gopath/src/chaincode/chaincode-go \
  --lang golang \
  --label ijazah_5.0
```

### 2. Install Package ke Org1 dan Org2

**Org1:**
```bash
docker exec -e CORE_PEER_ADDRESS=peer1org1.example.com:7051 \
  -e CORE_PEER_LOCALMSPID=Org1MSP \
  -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.ravly.com/msp \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer1.org1.ravly.com/tls/cacerts/localhost-7054.pem \
  cli.example.com peer lifecycle chaincode install /opt/chaincode-packages/ijazah_v5.tar.gz
```

**Org2:**
```bash
docker exec -e CORE_PEER_ADDRESS=peer2org2.example.com:8051 \
  -e CORE_PEER_LOCALMSPID=Org2MSP \
  -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.ravly.com/msp \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/crypto/peerOrganizations/org2.example.com/peers/peer2.org2.ravly.com/tls/cacerts/localhost-8054.pem \
  cli.example.com peer lifecycle chaincode install /opt/chaincode-packages/ijazah_v5.tar.gz
```

Catat `Package ID` dari output install. Contoh format:

```text
ijazah_5.0:<hash_package>
```

### 3. Approve Chaincode Definition

Ganti `<PACKAGE_ID>` dengan output dari tahap install dan `<NEXT_SEQUENCE>` dengan sequence baru.

**Org1:**
```bash
docker exec -e CORE_PEER_ADDRESS=peer1org1.example.com:7051 \
  -e CORE_PEER_LOCALMSPID=Org1MSP \
  -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.ravly.com/msp \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer1.org1.ravly.com/tls/cacerts/localhost-7054.pem \
  cli.example.com peer lifecycle chaincode approveformyorg \
  -o osn1.example.com:7050 --ordererTLSHostnameOverride osn1.example.com \
  --channelID appchannel-etcdraft --name ijazah --version 5.0 \
  --package-id <PACKAGE_ID> --sequence <NEXT_SEQUENCE> \
  --signature-policy "OR('Org1MSP.peer','Org2MSP.peer')" \
  --tls --cafile /var/hyperledger/crypto/ordererOrganizations/ordererOrg1.example.com/ordering-service-nodes/osn1.ordererOrg1.example.com/tls/cacerts/localhost-7054.pem
```

**Org2:**
```bash
docker exec -e CORE_PEER_ADDRESS=peer2org2.example.com:8051 \
  -e CORE_PEER_LOCALMSPID=Org2MSP \
  -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.ravly.com/msp \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/crypto/peerOrganizations/org2.example.com/peers/peer2.org2.ravly.com/tls/cacerts/localhost-8054.pem \
  cli.example.com peer lifecycle chaincode approveformyorg \
  -o osn1.example.com:7050 --ordererTLSHostnameOverride osn1.example.com \
  --channelID appchannel-etcdraft --name ijazah --version 5.0 \
  --package-id <PACKAGE_ID> --sequence <NEXT_SEQUENCE> \
  --signature-policy "OR('Org1MSP.peer','Org2MSP.peer')" \
  --tls --cafile /var/hyperledger/crypto/ordererOrganizations/ordererOrg1.example.com/ordering-service-nodes/osn1.ordererOrg1.example.com/tls/cacerts/localhost-7054.pem
```

### 4. Check Commit Readiness

```bash
docker exec -e CORE_PEER_ADDRESS=peer1org1.example.com:7051 \
  -e CORE_PEER_LOCALMSPID=Org1MSP \
  -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.ravly.com/msp \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer1.org1.ravly.com/tls/cacerts/localhost-7054.pem \
  cli.example.com peer lifecycle chaincode checkcommitreadiness \
  --channelID appchannel-etcdraft --name ijazah --version 5.0 --sequence <NEXT_SEQUENCE> \
  --signature-policy "OR('Org1MSP.peer','Org2MSP.peer')" \
  --tls --cafile /var/hyperledger/crypto/ordererOrganizations/ordererOrg1.example.com/ordering-service-nodes/osn1.ordererOrg1.example.com/tls/cacerts/localhost-7054.pem
```

Readiness harus menampilkan `Org1MSP: true` dan `Org2MSP: true`.

### 5. Commit Chaincode Definition

```bash
docker exec -e CORE_PEER_ADDRESS=peer1org1.example.com:7051 \
  -e CORE_PEER_LOCALMSPID=Org1MSP \
  -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.ravly.com/msp \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer1.org1.ravly.com/tls/cacerts/localhost-7054.pem \
  cli.example.com peer lifecycle chaincode commit \
  -o osn1.example.com:7050 --ordererTLSHostnameOverride osn1.example.com \
  --channelID appchannel-etcdraft --name ijazah --version 5.0 --sequence <NEXT_SEQUENCE> \
  --signature-policy "OR('Org1MSP.peer','Org2MSP.peer')" \
  --tls --cafile /var/hyperledger/crypto/ordererOrganizations/ordererOrg1.example.com/ordering-service-nodes/osn1.ordererOrg1.example.com/tls/cacerts/localhost-7054.pem \
  --peerAddresses peer1org1.example.com:7051 --tlsRootCertFiles /var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer1.org1.ravly.com/tls/cacerts/localhost-7054.pem \
  --peerAddresses peer2org2.example.com:8051 --tlsRootCertFiles /var/hyperledger/crypto/peerOrganizations/org2.example.com/peers/peer2.org2.ravly.com/tls/cacerts/localhost-8054.pem
```

### 6. Verifikasi Runtime

```bash
docker exec cli.example.com peer lifecycle chaincode querycommitted -C appchannel-etcdraft -n ijazah

docker exec -e CORE_PEER_ADDRESS=peer1org1.example.com:7051 \
  -e CORE_PEER_LOCALMSPID=Org1MSP \
  -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.ravly.com/msp \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer1.org1.ravly.com/tls/cacerts/localhost-7054.pem \
  cli.example.com peer chaincode query -C appchannel-etcdraft -n ijazah -c '{"Args":["SmartContract:GetAllCertificates"]}'
```

### 7. Smoke Test Signature `ipfsCid` Only

```bash
docker exec -e CORE_PEER_ADDRESS=peer1org1.example.com:7051 \
  -e CORE_PEER_LOCALMSPID=Org1MSP \
  -e CORE_PEER_MSPCONFIGPATH=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.ravly.com/msp \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/var/hyperledger/crypto/peerOrganizations/org1.example.com/peers/peer1.org1.ravly.com/tls/cacerts/localhost-7054.pem \
  cli.example.com peer chaincode query -C appchannel-etcdraft -n ijazah \
  -c '{"Args":["SmartContract:VerifyCertificate","<certificateId>","<ipfsCid>"]}'
```

## Migrasi ke Server Lain (Production/Staging Server)

Ketika memindahkan jaringan Hyperledger Fabric ini ke server baru, pastikan Anda memindahkan komponen-komponen krusial berikut agar sistem dapat berjalan tanpa kegagalan:

### 1. Komponen yang Wajib Dipindahkan/Disalin:
1. **Repository & Konfigurasi Docker:**
   - Seluruh folder repository ini (termasuk `docker-compose.yaml`, `.env`, dan subfolder `fabric/config`).
2. **Kriptografi & Sertifikat (`organization/`):**
   - Folder `organization/` berisi seluruh aset kriptografi (MSP, TLS certificates, private keys, database CA, folder `ca-deployments`, dll). Ini **sangat krusial** karena memuat kunci privat (`_sk`) untuk semua identitas organisasi, admin, peer, dan orderer. Jika folder ini tertinggal, Anda tidak dapat mengontrol jaringan ini lagi.
3. **Channel Conf (`fabric/config/channel-conf/`):**
   - Folder ini memuat `genesis_block.pb` dan `configtx.yaml`.

### 2. Opsi Penanganan Data Ledger (`/var/hyperledger/production`):
* **Opsi A: Melanjutkan State Ledger Saat Ini (Resume State)**
  - Salin seluruh direktori `/var/hyperledger/production` dari server lama ke lokasi yang sama di server baru.
  - Saat kontainer dinyalakan (`docker compose up -d`), Peer dan Orderer akan membaca database lokal dari volume mount dan langsung melanjutkan sinkronisasi dari tinggi blok terakhir tanpa perlu join channel ulang.
* **Opsi B: Memulai Jaringan Bersih (Reset State)**
  - Biarkan folder `/var/hyperledger/production` di server baru dalam keadaan kosong/bersih.
  - Setelah kontainer menyala, jalankan instruksi pada bagian **Bootstrapping / Joining Channel (Fresh State)** di atas untuk mendaftarkan ulang genesis block ke Orderer dan Peer.

### 3. Konfigurasi Jaringan & Port Firewall:
Pastikan port eksternal berikut diizinkan di firewall server baru jika diakses dari luar:
- **CA Services:** `7054` (Org1 CA), `9054` (Org2 CA), `8054` (TLS CA).
- **Orderer Nodes (gRPC/Operations/Admin):**
  - OSN1: `7050`, `8543`, `9443`
  - OSN2: `8050`, `8443`, `9543`
  - OSN3: `9050`, `8643`, `9643`
- **Peer Nodes (gRPC/Operations/Chaincode):**
  - Peer1 (Org1): `7051`, `7052`, `9453`
  - Peer2 (Org2): `8051`, `8052`, `9454`


