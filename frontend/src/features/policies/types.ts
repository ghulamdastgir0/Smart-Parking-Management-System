export interface PolicyDocument {
  id: string;
  title: string;
  filename: string;
  chunkCount: number;
  createdAt: string;
}

export interface UploadPolicyPayload {
  title: string;
  file: File;
}
