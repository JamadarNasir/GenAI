/**
 * ScreenshotTool — browser_take_screenshot
 */
import { BaseTool } from './BaseTool';
import { McpToolResult } from '../../common/McpClient.interface';

export interface ScreenshotParams {
  /** Optional element to screenshot (ref from snapshot) */
  ref?: string;
  element?: string;
  /** Full-page screenshot */
  fullPage?: boolean;
  /** Output filename */
  filename?: string;
  /** Image format */
  type?: 'png' | 'jpeg';
}

export interface ScreenshotResult {
  /** Base-64 encoded image data */
  imageData?: string;
  mimeType: string;
  success: boolean;
}

export class ScreenshotTool extends BaseTool<ScreenshotParams, ScreenshotResult> {
  readonly toolName = 'browser_take_screenshot';

  protected parseResult(result: McpToolResult): ScreenshotResult {
    const imageBlock = result.content?.find(b => b.type === 'image');
    if (imageBlock) {
      return {
        imageData: imageBlock.data,
        mimeType: imageBlock.mimeType || 'image/png',
        success: true,
      };
    }
    return { mimeType: 'image/png', success: false };
  }
}
