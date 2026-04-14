/**
 * FileUploadTool — browser_file_upload
 */
import { BaseTool } from './BaseTool';

export interface FileUploadParams {
  paths?: string[];
}

export class FileUploadTool extends BaseTool<FileUploadParams> {
  readonly toolName = 'browser_file_upload';
}
