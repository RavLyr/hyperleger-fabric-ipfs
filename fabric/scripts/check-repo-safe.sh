#!/usr/bin/env bash
set -euo pipefail

unsafe=0

while IFS= read -r -d '' path; do
  case "$path" in
    .env.example)
      ;;
    .env|.env.*|organization/*|apps/api/fabric-crypto/*|crypto-config/*|organizations/*|wallet/*|ledger/*|ledgersData/*|production/*|snapshots/*|state/*|couchdb/*|chaincode-packages/*|chaincode/basic/vendor/*|*.pem|*.key|*.crt|*.cert|*_sk|*.tar.gz|*.tgz|fabric-ca-server.db|IssuerSecretKey|IssuerRevocationPrivateKey)
      printf 'Unsafe file would be committed: %s\n' "$path"
      unsafe=1
      ;;
  esac
done < <(git ls-files -z --cached --others --exclude-standard)

if [[ "$unsafe" == "1" ]]; then
  exit 1
fi

printf 'Repository safety check passed.\n'
