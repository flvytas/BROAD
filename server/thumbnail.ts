import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function generateThumbnail(streamKey: string): Promise<string | null> {
  try {
    const thumbnailDir = './media/thumbnails';
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    const thumbnailPath = path.join(thumbnailDir, `${streamKey}.jpg`);
    const streamUrl = `http://localhost:8000/live/${streamKey}/index.m3u8`;

    // Use ffmpeg to capture a frame from the stream
    await execAsync(
      `ffmpeg -y -i "${streamUrl}" -vframes 1 -f image2 "${thumbnailPath}"`
    );

    return thumbnailPath;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    return null;
  }
}

export function getThumbnailPath(streamKey: string): string {
  return path.join('./media/thumbnails', `${streamKey}.jpg`);
}
