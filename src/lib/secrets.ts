import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const region = process.env.AWS_REGION ?? "us-east-2";
const secretName = process.env.EVCARE_SECRET_NAME ?? "evcare/production/config";

let cachedSecret: Record<string, string> | null = null;

export async function getSecrets(): Promise<Record<string, string>> {
  if (cachedSecret) return cachedSecret;
  if (!process.env.AWS_REGION) {
    return process.env as unknown as Record<string, string>;
  }
  try {
    const client = new SecretsManagerClient({ region });
    const cmd = new GetSecretValueCommand({ SecretId: secretName });
    const res = await client.send(cmd);
    const str = res.SecretString;
    if (!str) throw new Error("Empty secret");
    cachedSecret = JSON.parse(str) as Record<string, string>;
    return cachedSecret;
  } catch (err) {
    console.warn("Secrets Manager fetch failed, using env:", err);
    return process.env as unknown as Record<string, string>;
  }
}

export function clearSecretCache() {
  cachedSecret = null;
}
