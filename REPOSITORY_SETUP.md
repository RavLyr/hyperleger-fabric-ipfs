# Repository Safety

This repository should contain source code, reusable configuration templates, and documentation only.

Do commit:

- `docker-compose.yaml`
- `commands.md`
- `fabric/chaincode-go/**/*.go`
- `fabric/chaincode-go/go.mod`
- `fabric/chaincode-go/go.sum`
- `fabric/config/**/*.yaml`
- `.env.example`

Do not commit:

- `.env`
- `organization/`
- Fabric CA databases
- MSP/TLS private keys and generated certificates
- ledger/runtime state
- generated chaincode packages such as `chaincode-packages/basic.tar.gz`
- vendored Go dependencies

Before committing, check what Git would add:

```bash
git status --short --ignored
git add --dry-run .
bash scripts/check-repo-safe.sh
```

If any private key, CA database, generated certificate, or ledger state appears in the add list, stop and fix `.gitignore` first.
