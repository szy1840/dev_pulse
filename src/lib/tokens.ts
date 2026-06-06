import { createHash, randomBytes } from "crypto";

/**
 * CLI token format: `dp_live_<40 hex chars>`.
 * We store only a SHA-256 hash + a short prefix; the plaintext is returned once.
 */
export function generateCliToken(): { token: string; hash: string; prefix: string } {
  const secret = randomBytes(20).toString("hex"); // 40 hex chars
  const token = `dp_live_${secret}`;
  return {
    token,
    hash: hashToken(token),
    prefix: token.slice(0, 12), // "dp_live_" + first 4 of secret
  };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
