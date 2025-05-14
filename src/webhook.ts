import { createHmac } from "node:crypto";
import { File } from "./files";
import { UUID } from "./index";
import { Project } from "./projects";
import { Item } from "./gather";

export type WebhookRequest = {
  event: WebhookEvent;
  trigger: WebhookTrigger;
  project: Project;
  artifacts: WebhookArtifact[];
  log: WebhookLog[];

  /** @deprecated */
  file?: File;
  item?: Item;
};

export type WebhookEvent = {
  id: number;
  history_id: number;
  label: string;
};

export type WebhookTrigger = {
  id: number;
  type: number;
  reason: string;
  reason_long: string;
  payload: {
    item_id?: number;
    trigger_type?: number;
    trigger_id?: number;
    event_history_id?: number;
    document_id?: number;
    file_id?: string;
  };
};

export type WebhookArtifact = {
  type: string;
  artifact_label?: string;
  artifact_type?: 'Webhook Sent' | 'Map Figure Generated' | 'Auto Doc Generated' | 'Insights Graphs Generated' | 'Set Gather Value' | 'Email Sent' | WebhookTrigger['reason_long'];
  action_id?: number;
  action_label?: string;
  app_uuid?: string;
  item_id?: number;
  field_id?: number;
  app_title?: string;
  field_label?: string;
  new_value?: string;
  trigger_id?: number;
  trigger_type?: string;

  // Send Email
  recipients?: string[];
  subject?: string;
  body?: string;
  attachments?: Attachment[];
  webhook_url?: string;
  sent_at?: string;
  files?: File[];
  graph_id?: number;
};

export type Attachment = {
  id: string;
  file: File;
  name: string;
  file_id: UUID;
  figure_id?: null | number;
  document_id?: null | number;
  type: "File" | "Figure" | "Document";
  convert_to_pdf: boolean;
  auto_docs_options: Record<string, any>;
};

/**
 * 0: Log Level;
 * 1: Timestamp;
 * 2: Message
 */
export type WebhookLog = [string, string, string];

export enum WebhookAuthorizationStatus {
  Success = 0,
  TimestampError = 1,
  SignatureError = 2,
  MissingTimestamp = 3,
  MissingSignature = 4,
  InvalidApiKey = 5,
  MissingApiKey = 6,
}

export function formatAuthorizationStatus(status: WebhookAuthorizationStatus): string {
  return {
    [WebhookAuthorizationStatus.Success]: "Success",
    [WebhookAuthorizationStatus.TimestampError]: "Timestamp Error",
    [WebhookAuthorizationStatus.SignatureError]: "Signature Error",
    [WebhookAuthorizationStatus.InvalidApiKey]: "Invalid API Key",
    [WebhookAuthorizationStatus.MissingTimestamp]: "Missing Timestamp",
    [WebhookAuthorizationStatus.MissingSignature]: "Missing Signature",
    [WebhookAuthorizationStatus.MissingApiKey]: "Missing API Key",
  }[status];
}

/**
 * Verify the authenticity of a webhook request using the signature
 * @param request 
 * @param secretKey 
 * @param disableTimestampCheck for unit testing purposes
 * @returns WebhookAuthorizationStatus 0=Success
 */
export async function authenticateWebhook(
  request: Request,
  requestBody: string | null,
  apiKey: string,
  secretKey: string,
  disableTimestampCheck: boolean = false
): Promise<WebhookAuthorizationStatus> {
  const signature = request.headers.get("X-Signature");
  const timestamp = request.headers.get("X-Timestamp");
  const apiKeyFromRequest = request.headers.get("X-Api-Key");
  if (apiKeyFromRequest !== apiKey) {
    return WebhookAuthorizationStatus.InvalidApiKey;
  }
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (!signature) {
    return WebhookAuthorizationStatus.MissingSignature;
  }
  if (!timestamp) {
    return WebhookAuthorizationStatus.MissingTimestamp;
  }
  if (
    (!disableTimestampCheck &&
      Math.abs(currentTimestamp - parseInt(timestamp)) > 60)
  ) {
    return WebhookAuthorizationStatus.TimestampError;
  }
  const content = `${request.method}:${request.url}:${requestBody ? requestBody + ":" : ""
    }${timestamp}`;
  const hmac = createHmac("sha256", secretKey);
  const hash = hmac.update(content).digest("hex");
  return hash === signature ? WebhookAuthorizationStatus.Success : WebhookAuthorizationStatus.SignatureError;
}
