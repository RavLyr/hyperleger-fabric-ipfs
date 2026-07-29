import type { FabricResult } from '../../infrastructure/fabric/fabric-result';

export type FabricTransactionMode = 'evaluate' | 'submit';

export type FabricHealth = {
  readonly status: 'healthy' | 'connected' | 'degraded';
  readonly itemCount: number;
};

export type FabricInvokeResult = {
  readonly mode: FabricTransactionMode;
  readonly result: FabricResult;
};
