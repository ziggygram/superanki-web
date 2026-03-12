const DEFAULT_IMPORT_MAX_BYTES = 50 * 1024 * 1024;

export const SUPPORTED_IMPORT_EXTENSIONS = [".apkg", ".colpkg"] as const;

type ImportConfig = {
  apiUrl: string;
  apiToken: string;
  maxBytes: number;
};

export function getImportConfig(): ImportConfig | null {
  const apiUrl = process.env.SUPERANKI_IMPORT_API_URL;
  const apiToken = process.env.SUPERANKI_IMPORT_API_TOKEN;
  const maxBytes = Number(process.env.SUPERANKI_IMPORT_MAX_BYTES ?? DEFAULT_IMPORT_MAX_BYTES);

  if (!apiUrl || !apiToken) {
    return null;
  }

  return {
    apiUrl,
    apiToken,
    maxBytes: Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : DEFAULT_IMPORT_MAX_BYTES,
  };
}

export function isImportConfigured() {
  return Boolean(getImportConfig());
}

export function isSupportedImportFilename(filename: string) {
  const lower = filename.trim().toLowerCase();
  return SUPPORTED_IMPORT_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export function formatImportLimit(maxBytes: number) {
  const mb = Math.round(maxBytes / (1024 * 1024));
  return `${mb} MB`;
}
