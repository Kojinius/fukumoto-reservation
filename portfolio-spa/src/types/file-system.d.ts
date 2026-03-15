/** File System Access API — showSaveFilePicker 型宣言 */
interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileSystemFileHandle>;
}

/** @pdf-lib/fontkit モジュール宣言 */
declare module '@pdf-lib/fontkit' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fontkit: any;
  export default fontkit;
}
