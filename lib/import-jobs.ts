export const IMPORT_JOB_STATUSES = ["pending", "queued", "processing", "completed", "failed", "cancelled"] as const;

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

export type ImportJobRow = {
  id: number;
  user_id: string;
  deck_sync_id: number | null;
  source_filename: string;
  file_size_bytes: number;
  file_content_type: string | null;
  source_extension: string | null;
  status: ImportJobStatus;
  worker_job_id: string | null;
  worker_status: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export function isImportJobStatus(value: string): value is ImportJobStatus {
  return (IMPORT_JOB_STATUSES as readonly string[]).includes(value);
}

export function deriveSourceExtension(filename: string) {
  const trimmed = filename.trim().toLowerCase();
  const dotIndex = trimmed.lastIndexOf(".");
  return dotIndex >= 0 ? trimmed.slice(dotIndex) : null;
}

export function formatImportJobStatus(status: string) {
  switch (status) {
    case "pending":
      return "Pending handoff";
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function getImportCallbackConfig() {
  const url = process.env.SUPERANKI_IMPORT_CALLBACK_BASE_URL?.trim();
  const token = process.env.SUPERANKI_IMPORT_CALLBACK_TOKEN?.trim() || process.env.SUPERANKI_IMPORT_API_TOKEN?.trim() || null;

  if (!url || !token) {
    return null;
  }

  return { url: url.replace(/\/$/, ""), token };
}
