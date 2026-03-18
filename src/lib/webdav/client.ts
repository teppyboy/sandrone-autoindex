import { parseAutoindex, type Entry, type ParsedIndex } from "@/lib/parser";
import type {
  WebDavAuthCheckResult,
  WebDavProbeResult,
  WebDavServerSupportResult,
} from "@/lib/webdav/types";

export class WebDavError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "WebDavError";
    this.status = status;
  }
}

export function getCurrentDirectoryUrl(
  currentHref: string = window.location.href,
): URL {
  const url = new URL(currentHref, window.location.origin);

  if (!url.pathname.endsWith("/")) {
    url.pathname += "/";
  }

  url.search = "";
  url.hash = "";
  return url;
}

export function getWebDavAuthCheckUrl(
  currentOrigin: string = window.location.origin,
): string {
  const baseUrl = import.meta.env.BASE_URL || "/_autoindex/";
  return new URL("auth-check", new URL(baseUrl, currentOrigin)).toString();
}

export function buildUploadUrl(
  fileName: string,
  currentHref: string = window.location.href,
): string {
  return new URL(
    encodeURIComponent(fileName),
    getCurrentDirectoryUrl(currentHref),
  ).toString();
}

export function buildResourceUrl(
  fileName: string,
  currentHref: string = window.location.href,
): string {
  return new URL(
    encodeURIComponent(fileName),
    getCurrentDirectoryUrl(currentHref),
  ).toString();
}

export function buildDestinationUrl(
  targetPath: string,
  currentOrigin: string = window.location.origin,
): string {
  const normalized = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
  return new URL(normalized, currentOrigin).toString();
}

function responseSignalsWebDavSupport(response: Response): boolean {
  const allow = response.headers.get("Allow");
  const dav = response.headers.get("DAV");
  const authorVia = response.headers.get("MS-Author-Via");

  if (allow) {
    const methods = allow
      .toUpperCase()
      .split(",")
      .map((method) => method.trim());
    if (methods.includes("PUT")) return true;
  }

  if (dav) return true;
  if (authorVia && authorVia.toUpperCase().includes("DAV")) return true;

  return false;
}

export async function detectWebDavServerSupport(): Promise<WebDavServerSupportResult> {
  const target = getCurrentDirectoryUrl().toString();

  const optionsResponse = await fetch(target, {
    method: "OPTIONS",
    cache: "no-store",
  }).catch(() => null);

  if (optionsResponse?.ok && responseSignalsWebDavSupport(optionsResponse)) {
    return {
      state: "supported",
      allow: optionsResponse.headers.get("Allow"),
      dav: optionsResponse.headers.get("DAV"),
      authorVia: optionsResponse.headers.get("MS-Author-Via"),
    };
  }

  if (optionsResponse?.ok) {
    return {
      state: "unsupported",
      allow: optionsResponse.headers.get("Allow"),
      dav: optionsResponse.headers.get("DAV"),
      authorVia: optionsResponse.headers.get("MS-Author-Via"),
    };
  }

  const headResponse = await fetch(target, {
    method: "HEAD",
    cache: "no-store",
  }).catch(() => null);

  if (headResponse?.ok && responseSignalsWebDavSupport(headResponse)) {
    return {
      state: "supported",
      allow: headResponse.headers.get("Allow"),
      dav: headResponse.headers.get("DAV"),
      authorVia: headResponse.headers.get("MS-Author-Via"),
    };
  }

  return {
    state: "unsupported",
    allow:
      optionsResponse?.headers.get("Allow") ??
      headResponse?.headers.get("Allow") ??
      null,
    dav:
      optionsResponse?.headers.get("DAV") ??
      headResponse?.headers.get("DAV") ??
      null,
    authorVia:
      optionsResponse?.headers.get("MS-Author-Via") ??
      headResponse?.headers.get("MS-Author-Via") ??
      null,
  };
}

export async function verifyWebDavCredentials(
  authorization: string,
): Promise<WebDavAuthCheckResult> {
  const response = await fetch(getWebDavAuthCheckUrl(), {
    method: "HEAD",
    headers: {
      Authorization: authorization,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return {
      kind: "error",
      message:
        "Could not verify your WebDAV credentials. Check your connection and the auth-check endpoint, then try again.",
      status: null,
    };
  }

  if (response.status === 401) {
    return {
      kind: "unauthorized",
      message: "Incorrect username or password.",
      status: response.status,
    };
  }

  if (response.ok) {
    return {
      kind: "valid",
      message: "Signed in successfully.",
      status: response.status,
    };
  }

  if (response.status === 404) {
    return {
      kind: "error",
      message:
        "Could not verify your WebDAV credentials because the auth-check endpoint returned 404. Use an exact-match server block like `location = /_autoindex/auth-check` and `try_files /__autoindex_auth_check_never_exists__ =204;` so valid credentials return 204 instead of 404.",
      status: response.status,
    };
  }

  return {
    kind: "error",
    message: `Could not verify your WebDAV credentials. The auth-check endpoint returned ${response.status}. Expected 204 for valid credentials or 401 for invalid credentials.`,
    status: response.status,
  };
}

export async function probeWriteSupport(
  authorization: string,
): Promise<WebDavProbeResult> {
  const response = await fetch(getCurrentDirectoryUrl().toString(), {
    method: "OPTIONS",
    headers: {
      Authorization: authorization,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return {
      kind: "unknown",
      message:
        "Signed in, but the server did not answer the WebDAV capability check for this directory.",
      allow: null,
      dav: null,
    };
  }

  const allow = response.headers.get("Allow");
  const dav = response.headers.get("DAV");

  if (response.status === 401) {
    return {
      kind: "unauthorized",
      message: "Incorrect username or password.",
      allow,
      dav,
    };
  }

  if (response.status === 403) {
    return {
      kind: "forbidden",
      message: "Signed in, but uploads are not allowed in this directory.",
      allow,
      dav,
    };
  }

  if (response.status === 405 || response.status === 501) {
    return {
      kind: "unknown",
      message:
        "Signed in, but the server did not answer an OPTIONS capability check for this directory.",
      allow,
      dav,
    };
  }

  if (!response.ok) {
    return {
      kind: "unknown",
      message: `Signed in. The capability check returned ${response.status}, so upload support could not be confirmed for this directory.`,
      allow,
      dav,
    };
  }

  if (allow) {
    const methods = allow
      .toUpperCase()
      .split(",")
      .map((method) => method.trim());
    if (methods.includes("PUT")) {
      return {
        kind: "available",
        message: null,
        allow,
        dav,
      };
    }

    return {
      kind: "unsupported",
      message:
        "The server responded, but did not advertise PUT for this directory.",
      allow,
      dav,
    };
  }

  return {
    kind: "unknown",
    message:
      "Signed in. Upload support could not be confirmed from the server response for this directory.",
    allow,
    dav,
  };
}

export async function refreshAutoindexListing(): Promise<ParsedIndex> {
  const response = await fetch(window.location.href, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new WebDavError(
      `Failed to refresh the directory listing (${response.status}).`,
      response.status,
    );
  }

  const html = await response.text();
  const document = new DOMParser().parseFromString(html, "text/html");
  const parsed = parseAutoindex(document);

  if (!parsed) {
    throw new WebDavError(
      "The refreshed page did not contain a recognizable autoindex listing.",
    );
  }

  return parsed;
}

export async function fetchDirectoryListing(
  directoryUrl: string,
): Promise<Entry[]> {
  const url = new URL(directoryUrl, window.location.origin);
  if (!url.pathname.endsWith("/")) {
    url.pathname += "/";
  }

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new WebDavError(
      `Failed to fetch directory listing (${response.status}).`,
      response.status,
    );
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const parsed = parseAutoindex(doc);

  if (!parsed) return [];

  return parsed.entries;
}

export async function checkResourceExists(targetUrl: string): Promise<boolean> {
  const response = await fetch(targetUrl, {
    method: "HEAD",
    cache: "no-store",
  });

  if (response.status === 404) return false;
  if (response.ok) return true;

  throw new WebDavError(
    getWebDavStatusMessage(response.status),
    response.status,
  );
}

interface UploadFileOptions {
  file: File;
  targetUrl: string;
  authorization: string;
  onProgress?: (progress: number) => void;
}

export function uploadFile({
  file,
  targetUrl,
  authorization,
  onProgress,
}: UploadFileOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", targetUrl);
    request.setRequestHeader("Authorization", authorization);

    if (file.type) {
      request.setRequestHeader("Content-Type", file.type);
    }

    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    });

    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      reject(
        new WebDavError(getWebDavStatusMessage(request.status), request.status),
      );
    });

    request.addEventListener("error", () => {
      reject(new WebDavError("The upload failed due to a network error."));
    });

    request.addEventListener("abort", () => {
      reject(new WebDavError("The upload was cancelled."));
    });

    request.send(file);
  });
}

export function getWebDavStatusMessage(status: number): string {
  if (status === 401)
    return "Your WebDAV credentials were rejected. Sign in again to continue.";
  if (status === 403)
    return "This account cannot upload to the current directory.";
  if (status === 404) return "The resource was not found.";
  if (status === 405 || status === 501)
    return "This server does not accept WebDAV uploads for the current directory.";
  if (status === 409)
    return "The target path conflicts with an existing file or folder.";
  if (status === 412) return "The server rejected the overwrite precondition.";
  if (status === 413) return "The file is larger than the server allows.";
  if (status === 423) return "The target path is locked by the server.";
  if (status >= 500) return "The server failed while processing the upload.";
  return `The request failed with status ${status}.`;
}

export async function moveResource(
  sourceUrl: string,
  destinationUrl: string,
  authorization: string,
  overwrite: boolean = true,
): Promise<void> {
  const response = await fetch(sourceUrl, {
    method: "MOVE",
    headers: {
      Authorization: authorization,
      Destination: destinationUrl,
      Overwrite: overwrite ? "T" : "F",
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    throw new WebDavError(
      "The move operation failed due to a network error.",
    );
  }

  if (response.status >= 200 && response.status < 300) return;

  throw new WebDavError(getWebDavStatusMessage(response.status), response.status);
}

export async function deleteResource(
  targetUrl: string,
  authorization: string,
): Promise<void> {
  const response = await fetch(targetUrl, {
    method: "DELETE",
    headers: {
      Authorization: authorization,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    throw new WebDavError(
      "The delete operation failed due to a network error.",
    );
  }

  if (response.status >= 200 && response.status < 300) return;

  throw new WebDavError(getWebDavStatusMessage(response.status), response.status);
}

export async function createDirectory(
  targetUrl: string,
  authorization: string,
): Promise<void> {
  const response = await fetch(targetUrl, {
    method: "MKCOL",
    headers: {
      Authorization: authorization,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    throw new WebDavError(
      "The folder creation failed due to a network error.",
    );
  }

  if (response.status >= 200 && response.status < 300) return;

  if (response.status === 405) {
    throw new WebDavError(
      "A resource with this name already exists.",
      response.status,
    );
  }

  throw new WebDavError(getWebDavStatusMessage(response.status), response.status);
}

export async function createEmptyFile(
  targetUrl: string,
  authorization: string,
): Promise<void> {
  const response = await fetch(targetUrl, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": "text/plain",
    },
    body: "",
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    throw new WebDavError(
      "The file creation failed due to a network error.",
    );
  }

  if (response.status >= 200 && response.status < 300) return;

  throw new WebDavError(getWebDavStatusMessage(response.status), response.status);
}
