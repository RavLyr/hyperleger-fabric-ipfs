import { fabricConfig, getFabricConfig } from '../../config/fabric.config';
import { FabricGatewayClient, type FabricSubmitResult } from '../../infrastructure/fabric/fabric-gateway.client';
import type { FabricResult } from '../../infrastructure/fabric/fabric-result';
import type { InvokeFabricBody } from './fabric.dto';
import type { FabricHealth, FabricInvokeResult } from './fabric.types';

const fabricClients = new Map<string, FabricGatewayClient>();

function getFabricClient(mspId = fabricConfig.mspId): FabricGatewayClient {
  const config = getFabricConfig(mspId);
  let client = fabricClients.get(config.mspId);

  if (!client) {
    client = new FabricGatewayClient(config);
    fabricClients.set(config.mspId, client);
  }

  return client;
}

export function fabricGatewayForMsp(mspId: string) {
  return {
    evaluateTransaction(functionName: string, ...args: string[]): Promise<FabricResult> {
      return evaluateTransactionForMsp(mspId, functionName, ...args);
    },
    submitTransaction(functionName: string, ...args: string[]): Promise<FabricResult> {
      return submitTransactionForMsp(mspId, functionName, ...args);
    },
    submitTransactionWithTxId(functionName: string, ...args: string[]): Promise<FabricSubmitResult> {
      return submitTransactionWithTxIdForMsp(mspId, functionName, ...args);
    }
  };
}

export async function getFabricHealth(): Promise<FabricHealth> {
  const demoIssuerExists = await evaluateTransaction('SmartContract:IssuerExists', 'DEMO_ISSUER');

  return {
    status: demoIssuerExists === true || demoIssuerExists === 'true' ? 'connected' : 'degraded',
    itemCount: null
  };
}

export async function invokeFabric(input: InvokeFabricBody): Promise<FabricInvokeResult> {
  const args = input.args ?? [];
  const result =
    input.mode === 'evaluate'
      ? await evaluateTransaction(input.functionName, ...args)
      : await submitTransaction(input.functionName, ...args);

  return {
    mode: input.mode ?? 'submit',
    result
  };
}

export async function evaluateTransaction(functionName: string, ...args: string[]): Promise<FabricResult> {
  return evaluateTransactionForMsp(fabricConfig.mspId, functionName, ...args);
}

export async function submitTransaction(functionName: string, ...args: string[]): Promise<FabricResult> {
  return submitTransactionForMsp(fabricConfig.mspId, functionName, ...args);
}

export async function submitTransactionWithTxId(
  functionName: string,
  ...args: string[]
): Promise<FabricSubmitResult> {
  return submitTransactionWithTxIdForMsp(fabricConfig.mspId, functionName, ...args);
}

export async function evaluateTransactionForMsp(
  mspId: string,
  functionName: string,
  ...args: string[]
): Promise<FabricResult> {
  return getFabricClient(mspId).evaluateTransaction(functionName, args);
}

export async function submitTransactionForMsp(
  mspId: string,
  functionName: string,
  ...args: string[]
): Promise<FabricResult> {
  return getFabricClient(mspId).submitTransaction(functionName, args);
}

export async function submitTransactionWithTxIdForMsp(
  mspId: string,
  functionName: string,
  ...args: string[]
): Promise<FabricSubmitResult> {
  return getFabricClient(mspId).submitTransactionWithTxId(functionName, args);
}

export function closeFabricClient(): void {
  for (const client of fabricClients.values()) {
    client.close();
  }

  fabricClients.clear();
}
