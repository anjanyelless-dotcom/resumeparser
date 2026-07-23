import axios from "axios";

import { apiClient } from "./client";

const isLoopbackHost = (host: string) =>
  host === "localhost" || host === "127.0.0.1" || host.startsWith("127.");

const getUrlPort = (url: URL) => {
  if (url.port) return url.port;
  return url.protocol === "https:" ? "443" : "80";
};

const shouldUseApiClient = (url: string) => {
  const baseURL = apiClient.defaults.baseURL?.toString() ?? "";
  const isAbsolute = /^https?:\/\//i.test(url);
  if (!isAbsolute) return true;
  if (!baseURL) return false;

  try {
    const target = new URL(url);
    const base = new URL(baseURL);

    if (target.origin === base.origin) return true;

    const samePort = getUrlPort(target) === getUrlPort(base);
    if (
      samePort &&
      isLoopbackHost(target.hostname) &&
      isLoopbackHost(base.hostname)
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

export const fetchFileAsBlobUrl = async (url: string) => {
  const response = shouldUseApiClient(url)
    ? await apiClient.get<Blob>(url, { responseType: "blob", timeout: 60000 })
    : await axios.get<Blob>(url, { responseType: "blob", timeout: 60000 });

  const blob = response.data;
  const contentType =
    (response.headers?.["content-type"] as string | undefined) ?? "";

  if (
    contentType.includes("application/json") ||
    contentType.includes("text/html")
  ) {
    const text = await blob.text().catch(() => "");
    const match = text.match(/"detail"\s*:\s*"([^"]+)"/);
    const detail = match?.[1] || "Preview unavailable";
    throw new Error(detail);
  }

  if (contentType.startsWith("image/")) {
    return URL.createObjectURL(blob);
  }

  const sniffBuf = await blob.slice(0, 1024).arrayBuffer();
  const sniffText = new TextDecoder().decode(sniffBuf);
  const isPdf = sniffText.includes("%PDF");
  const isZip = sniffText.startsWith("PK");

  if (!isPdf) {
    if (isZip) {
      throw new Error(
        "Preview not supported for this file type. Please download.",
      );
    }
    if (contentType && contentType.includes("pdf")) {
      return URL.createObjectURL(blob);
    }
    throw new Error("Preview unavailable for this file type. Please download.");
  }

  return URL.createObjectURL(blob);
};

/** Fetch PDF converted to HTML for click-to-highlight preview. */
export const fetchFileHtml = async (jobId: string): Promise<string> => {
  const response = await apiClient.get(`/api/files/${jobId}/html`, {
    timeout: 60000,
    responseType: "text",
  });
  return String(response.data);
};

export const fetchFileAsBlob = async (url: string) => {
  const response = shouldUseApiClient(url)
    ? await apiClient.get<Blob>(url, { responseType: "blob", timeout: 60000 })
    : await axios.get<Blob>(url, { responseType: "blob", timeout: 60000 });

  const blob = response.data;
  const contentType =
    (response.headers?.["content-type"] as string | undefined) ?? "";

  if (
    contentType.includes("application/json") ||
    contentType.includes("text/html")
  ) {
    const text = await blob.text().catch(() => "");
    const match = text.match(/"detail"\s*:\s*"([^"]+)"/);
    const detail = match?.[1] || "File fetch failed";
    throw new Error(detail);
  }

  return blob;
};

const getFilenameFromContentDisposition = (value: string | undefined) => {
  if (!value) return null;
  const match = value.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const filename = decodeURIComponent(match?.[1] || match?.[2] || "");
  return filename || null;
};

export const downloadFile = async (url: string, fallbackFilename: string) => {
  if (!shouldUseApiClient(url)) {
    window.open(url, "_blank");
    return;
  }

  const response = await apiClient.get<Blob>(url, {
    responseType: "blob",
    timeout: 60000,
  });

  const blob = response.data;
  const contentDisposition = response.headers?.["content-disposition"] as
    | string
    | undefined;
  const filename =
    getFilenameFromContentDisposition(contentDisposition) || fallbackFilename;
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
};
