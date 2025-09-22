import { request } from './api';
import { formatBytes } from './format';

export interface UploadRules {
  maxBytes: number;
  allowedMimeTypes: string[];
}

export const fetchUploadRules = async (): Promise<UploadRules> =>
  (await request<{ upload: UploadRules }>('/config')).upload;

/**
 * Mirrors what the server enforces, so a file is rejected before an issue is
 * created rather than after. The server still validates — this is only to keep
 * the user from doing something it will refuse.
 */
export function rejectionReason(file: File, rules: UploadRules): string | null {
  if (file.size > rules.maxBytes) {
    return `${file.name} is ${formatBytes(file.size)}. The limit is ${formatBytes(rules.maxBytes)}.`;
  }
  if (!rules.allowedMimeTypes.includes(file.type)) {
    return `${file.name} is not a supported file type.`;
  }
  return null;
}
