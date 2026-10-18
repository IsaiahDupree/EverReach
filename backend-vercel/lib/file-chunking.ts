/**
 * File Chunking Utilities
 * Handles splitting large audio files for transcription services
 */

import { getServiceStorageClient, getDefaultBucketName } from './storage';

// Max file sizes (with safety margin)
export const MAX_FILE_SIZES = {
  // OpenAI Whisper: 25MB limit, we use 20MB for safety
  WHISPER: 20 * 1024 * 1024, // 20MB
  
  // General processing limit
  PROCESSING: 50 * 1024 * 1024, // 50MB
  
  // Chunk size for splitting (10MB chunks for overlap)
  CHUNK_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

export interface FileChunk {
  index: number;
  start: number;
  end: number;
  size: number;
  path: string;
}

export interface ChunkingResult {
  needsChunking: boolean;
  totalSize: number;
  chunks?: FileChunk[];
  singleFile?: {
    path: string;
    size: number;
  };
}

/**
 * Check if file needs chunking based on size and service
 */
export async function checkFileSize(
  filePath: string,
  maxSize: number = MAX_FILE_SIZES.WHISPER
): Promise<{ size: number; needsChunking: boolean }> {
  const storage = getServiceStorageClient();
  const bucket = getDefaultBucketName();

  // Get file size from storage
  const { data, error } = await storage.storage
    .from(bucket)
    .list(filePath.split('/').slice(0, -1).join('/'), {
      search: filePath.split('/').pop(),
    });

  if (error || !data || data.length === 0) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileSize = data[0].metadata?.size || 0;
  const needsChunking = fileSize > maxSize;

  return { size: fileSize, needsChunking };
}

/**
 * Download file from storage
 */
export async function downloadFile(filePath: string): Promise<ArrayBuffer> {
  const storage = getServiceStorageClient();
  const bucket = getDefaultBucketName();

  const { data, error } = await storage.storage
    .from(bucket)
    .download(filePath);

  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message || 'Unknown error'}`);
  }

  return await data.arrayBuffer();
}

/**
 * Upload file chunk to storage
 */
export async function uploadChunk(
  chunkData: ArrayBuffer,
  chunkPath: string
): Promise<void> {
  const storage = getServiceStorageClient();
  const bucket = getDefaultBucketName();

  const { error } = await storage.storage
    .from(bucket)
    .upload(chunkPath, chunkData, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload chunk: ${error.message}`);
  }
}

/**
 * Split audio file into chunks
 * For MP3/audio files, we need to be careful with splits to maintain playability
 */
export async function chunkAudioFile(
  filePath: string,
  maxChunkSize: number = MAX_FILE_SIZES.CHUNK_SIZE
): Promise<FileChunk[]> {
  const { size, needsChunking } = await checkFileSize(filePath, maxChunkSize);

  if (!needsChunking) {
    return [{
      index: 0,
      start: 0,
      end: size,
      size,
      path: filePath,
    }];
  }

  // Download the file
  const fileData = await downloadFile(filePath);
  const fileBuffer = new Uint8Array(fileData);

  // Calculate number of chunks needed
  const numChunks = Math.ceil(size / maxChunkSize);
  const chunks: FileChunk[] = [];

  const baseDir = filePath.substring(0, filePath.lastIndexOf('/'));
  const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
  const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  const fileExt = fileName.substring(fileName.lastIndexOf('.'));

  for (let i = 0; i < numChunks; i++) {
    const start = i * maxChunkSize;
    const end = Math.min(start + maxChunkSize, size);
    const chunkSize = end - start;

    // Extract chunk data
    const chunkData = fileBuffer.slice(start, end);

    // Generate chunk path
    const chunkPath = `${baseDir}/${fileNameWithoutExt}_chunk${i}${fileExt}`;

    // Upload chunk to storage
    await uploadChunk(chunkData.buffer, chunkPath);

    chunks.push({
      index: i,
      start,
      end,
      size: chunkSize,
      path: chunkPath,
    });
  }

  return chunks;
}

/**
 * Process file with automatic chunking if needed
 */
export async function prepareFileForProcessing(
  filePath: string,
  maxSize: number = MAX_FILE_SIZES.WHISPER
): Promise<ChunkingResult> {
  const { size, needsChunking } = await checkFileSize(filePath, maxSize);

  if (!needsChunking) {
    return {
      needsChunking: false,
      totalSize: size,
      singleFile: {
        path: filePath,
        size,
      },
    };
  }

  // Chunk the file
  const chunks = await chunkAudioFile(filePath, maxSize);

  return {
    needsChunking: true,
    totalSize: size,
    chunks,
  };
}

/**
 * Clean up temporary chunks after processing
 */
export async function cleanupChunks(chunks: FileChunk[]): Promise<void> {
  const storage = getServiceStorageClient();
  const bucket = getDefaultBucketName();

  const chunkPaths = chunks
    .filter(c => c.path.includes('_chunk'))
    .map(c => c.path);

  if (chunkPaths.length === 0) return;

  const { error } = await storage.storage
    .from(bucket)
    .remove(chunkPaths);

  if (error) {
    console.error('[FileChunking] Failed to cleanup chunks:', error);
  }
}

/**
 * Get file size info without downloading
 */
export async function getFileSizeInfo(filePath: string): Promise<{
  size: number;
  needsChunkingForWhisper: boolean;
  needsChunkingForProcessing: boolean;
  estimatedChunks: number;
}> {
  const { size } = await checkFileSize(filePath, MAX_FILE_SIZES.PROCESSING);

  return {
    size,
    needsChunkingForWhisper: size > MAX_FILE_SIZES.WHISPER,
    needsChunkingForProcessing: size > MAX_FILE_SIZES.PROCESSING,
    estimatedChunks: Math.ceil(size / MAX_FILE_SIZES.CHUNK_SIZE),
  };
}
