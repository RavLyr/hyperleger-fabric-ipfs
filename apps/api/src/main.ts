import { env } from './config/env';
import { closeFabricClient } from './modules/fabric/fabric.service';
import { app } from './app';
import { startBulkIssuanceWorker } from './modules/certificates/bulk-issuance.worker';

const worker = startBulkIssuanceWorker();

const server = app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`${signal} received, shutting down`);

  server.close(async (): Promise<void> => {
    closeFabricClient();
    await worker.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

