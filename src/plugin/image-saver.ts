/**
 * Image Saving Utility
 * 
 * Handles saving generated images to disk and returning file paths.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Default directory for saving generated images.
 * Uses ~/.opencode/generated-images/
 */
function getImageOutputDir(): string {
  const homeDir = os.homedir();
  const outputDir = path.join(homeDir, '.opencode', 'generated-images');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  return outputDir;
}

/**
 * Generate a unique filename for the image.
 */
function generateImageFilename(mimeType: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).substring(2, 8);
  
  // Determine extension from mime type
  let ext = 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    ext = 'jpg';
  } else if (mimeType.includes('gif')) {
    ext = 'gif';
  } else if (mimeType.includes('webp')) {
    ext = 'webp';
  }
  
  return `image-${timestamp}-${random}.${ext}`;
}

/**
 * Save base64 image data to disk and return the file path.
 * 
 * @param base64Data - The base64-encoded image data
 * @param mimeType - The MIME type of the image (e.g., "image/jpeg")
 * @returns The absolute path to the saved image file
 */
export function saveImageToDisk(base64Data: string, mimeType: string): string {
  try {
    const outputDir = getImageOutputDir();
    const filename = generateImageFilename(mimeType);
    const filePath = path.join(outputDir, filename);
    
    // Decode base64 and write to file
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    
    return filePath;
  } catch (error) {
    // If saving fails, return empty string (caller will fall back to base64)
    console.error('[image-saver] Failed to save image:', error);
    return '';
  }
}

/**
 * Process inlineData and return either a file path or base64 data URL.
 * Attempts to save to disk first, falls back to base64 if saving fails.
 * 
 * @param inlineData - Object containing mimeType and base64 data
 * @returns Markdown image string with either file path or data URL
 */
export function processImageData(inlineData: { mimeType?: string; data?: string }): string | null {
  const mimeType = inlineData.mimeType || 'image/png';
  const data = inlineData.data;
  
  if (!data) {
    return null;
  }
  
  // Try to save to disk first
  const filePath = saveImageToDisk(data, mimeType);
  
  if (filePath) {
    // Successfully saved - return file path with open command hint
    return `![Generated Image](${filePath})\n\nImage saved to: \`${filePath}\`\n\nTo view: \`open "${filePath}"\``;
  }
  
  // Fall back to base64 data URL
  return `![Generated Image](data:${mimeType};base64,${data})`;
}
