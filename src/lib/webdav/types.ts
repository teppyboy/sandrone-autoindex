export type WebDavSessionStatus =
  | "signed_out"
  | "verifying"
  | "authenticating"
  | "authenticated";

export type WebDavCapabilityState =
  | "unknown"
  | "checking"
  | "available"
  | "forbidden"
  | "unsupported";

export type WebDavServerSupportState = "checking" | "supported" | "unsupported";

export type WebDavStorageScope = "session" | "local";

export interface StoredWebDavAuth {
  username: string;
  authorization: string;
}

export interface StoredWebDavAuthRecord extends StoredWebDavAuth {
  storage: WebDavStorageScope;
}

export interface WebDavAuthCheckResult {
  kind: "valid" | "unauthorized" | "error";
  message: string;
  status: number | null;
}

export interface WebDavProbeResult {
  kind: "available" | "forbidden" | "unauthorized" | "unsupported" | "unknown";
  message: string | null;
  allow: string | null;
  dav: string | null;
}

export interface WebDavServerSupportResult {
  state: Exclude<WebDavServerSupportState, "checking">;
  allow: string | null;
  dav: string | null;
  authorVia: string | null;
}

export type UploadItemStatus =
  | "pending"
  | "checking"
  | "uploading"
  | "success"
  | "conflict"
  | "error";

export interface UploadItem {
  id: string;
  file: File;
  status: UploadItemStatus;
  progress: number;
  message: string | null;
}

export type FileOperationStatus = "idle" | "loading" | "error";
