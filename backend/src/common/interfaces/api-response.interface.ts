export interface ApiResponseMeta {
  timestamp: string;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
  meta?: ApiResponseMeta;
}
