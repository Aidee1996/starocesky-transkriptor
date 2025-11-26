
export enum TranscriptionMode {
  DIPLOMATIC = 'DIPLOMATIC',
  MODERN = 'MODERN'
}

export enum RequestMode {
  DIPLOMATIC = 'DIPLOMATIC',
  MODERN = 'MODERN',
  BOTH = 'BOTH'
}

export interface TranscriptionResult {
  diplomatic?: string;
  modern?: string;
}

export interface FileData {
  id: string; // Added ID for list management
  file: File;
  base64: string;
  mimeType: string;
}

export interface BatchItem extends FileData {
  status: AppStatus;
  result?: TranscriptionResult;
  error?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
