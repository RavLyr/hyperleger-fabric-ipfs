import axios from "axios";
import FormData from "form-data";
import { env } from "../../config/env";

export async function uploadToIPFS(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const formData = new FormData();

  formData.append("file", buffer, {
    filename: fileName,
  });

  const response = await axios.post(
    `${env.IPFS_API_URL}/api/v0/add?cid-version=1`,
    formData,
    {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
    }
  );

  return response.data.Hash;
}

export function getIPFSGatewayUrl(cid: string): string {
  return `${env.IPFS_GATEWAY_URL}/ipfs/${cid}`;
}
export async function cidExists(cid: string): Promise<boolean> {
  try {
    const response = await axios.head(getIPFSGatewayUrl(cid), {
      validateStatus: (status) => status >= 200 && status < 300,
    });

    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}
