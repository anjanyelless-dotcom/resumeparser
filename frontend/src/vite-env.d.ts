/// <reference types="vite/client" />

declare module "mammoth" {
  export type ConvertToHtmlResult = {
    value: string;
    messages?: unknown[];
  };

  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: unknown,
  ): Promise<ConvertToHtmlResult>;
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 
