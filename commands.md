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
