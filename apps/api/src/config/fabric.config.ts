import { env } from './env';

export type FabricConfig = {
  readonly channelName: string;
  readonly chaincodeName: string;
  readonly mspId: string;
  readonly peerEndpoint: string;
  readonly peerTlsHostOverride: string;
  readonly tlsCertPath: string;
  readonly clientCertPath: string;
  readonly clientKeyPath: string;
};

function envOr(name: string, fallback: string): string {
  const value = process.env[name]?.trim();

  return value || fallback;
}

export const fabricConfig: FabricConfig = {
  channelName: env.FABRIC_CHANNEL_NAME,
  chaincodeName: env.FABRIC_CHAINCODE_NAME,
  mspId: env.FABRIC_MSP_ID,
  peerEndpoint: env.FABRIC_PEER_ENDPOINT,
  peerTlsHostOverride: env.FABRIC_PEER_TLS_HOST_OVERRIDE,
  tlsCertPath: env.FABRIC_TLS_CERT_PATH,
  clientCertPath: env.FABRIC_CLIENT_CERT_PATH,
  clientKeyPath: env.FABRIC_CLIENT_KEY_PATH
};

const org1Config: FabricConfig = {
  ...fabricConfig,
  mspId: envOr('FABRIC_ORG1_MSP_ID', fabricConfig.mspId),
  peerEndpoint: envOr('FABRIC_ORG1_PEER_ENDPOINT', fabricConfig.peerEndpoint),
  peerTlsHostOverride: envOr('FABRIC_ORG1_PEER_TLS_HOST_OVERRIDE', fabricConfig.peerTlsHostOverride),
  tlsCertPath: envOr('FABRIC_ORG1_TLS_CERT_PATH', fabricConfig.tlsCertPath),
  clientCertPath: envOr('FABRIC_ORG1_CLIENT_CERT_PATH', fabricConfig.clientCertPath),
  clientKeyPath: envOr('FABRIC_ORG1_CLIENT_KEY_PATH', fabricConfig.clientKeyPath)
};

const org2MspId = envOr('FABRIC_ORG2_MSP_ID', 'Org2MSP');

export const fabricConfigsByMspId = new Map<string, FabricConfig>([
  [org1Config.mspId, org1Config],
  [
    org2MspId,
    {
      ...fabricConfig,
      mspId: org2MspId,
      peerEndpoint: envOr('FABRIC_ORG2_PEER_ENDPOINT', 'peer2org2.example.com:8051'),
      peerTlsHostOverride: envOr('FABRIC_ORG2_PEER_TLS_HOST_OVERRIDE', 'peer2org2.example.com'),
      tlsCertPath: envOr(
        'FABRIC_ORG2_TLS_CERT_PATH',
        '/fabric-crypto/peerOrganizations/org2.example.com/peers/peer2.org2.ravly.com/tls/cacerts/localhost-8054.pem'
      ),
      clientCertPath: envOr(
        'FABRIC_ORG2_CLIENT_CERT_PATH',
        '/fabric-crypto/peerOrganizations/org2.example.com/peers/peer0.org2.ravly.com/msp/signcerts/org2-admin-cert.pem'
      ),
      clientKeyPath: envOr(
        'FABRIC_ORG2_CLIENT_KEY_PATH',
        '/fabric-crypto/peerOrganizations/org2.example.com/peers/peer0.org2.ravly.com/msp/keystore/87d6baece02c90f084ca01b1a74be1d5c467aa3fefcd061334628620862d1ec1_sk'
      )
    }
  ]
]);

export function getFabricConfig(mspId = fabricConfig.mspId): FabricConfig {
  const config = fabricConfigsByMspId.get(mspId);

  if (!config) {
    throw new Error(`Unsupported Fabric MSP ID: ${mspId}`);
  }

  return config;
}
