# IPFS Hyperledger

Monorepo for the Hyperledger Fabric network, IPFS backend API, and Next.js certificate verification web app.

## Structure

- `apps/web`: Next.js frontend.
- `apps/api`: Express TypeScript API for IPFS and Hyperledger Fabric Gateway.
- `chaincode/basic`: Fabric chaincode.
- `fabric`: Fabric compose files, config, and scripts.
- `packages/shared`: Shared workspace package placeholder.
- `docs`: Repository notes and operational commands.

## Development

```bash
pnpm install
pnpm dev:web
pnpm dev:api
```

Copy `.env.example` files in `apps/web` and `apps/api` to local `.env` files before running services.
