import { createHmac } from "node:crypto";

export async function authenticateWebhook(
  request: Request,
  secretKey: string,
  disableTimestampCheck: boolean = false
): Promise<boolean> {
  const signature = request.headers.get("X-Signature");
  const timestamp = request.headers.get("X-Timestamp");
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (
    !signature ||
    !timestamp ||
    (!disableTimestampCheck &&
      Math.abs(currentTimestamp - parseInt(timestamp)) > 60)
  ) {
    return false;
  }
  const content = `${request.method}:${request.url}:${request.body ? (await request.text()).replace(/\//g, "\\/") + ":" : ""
    }${timestamp}`;
  const hmac = createHmac("sha256", secretKey);
  const hash = hmac.update(content).digest("hex");
  return hash === signature;
}
