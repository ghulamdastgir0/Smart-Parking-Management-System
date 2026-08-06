import { apiClient } from "@/lib/api-client";
import type { PolicyDocument, UploadPolicyPayload } from "./types";

export const policiesApi = {
  findAll: () => apiClient.get<PolicyDocument[]>("/policies").then((res) => res.data),

  upload: ({ title, file }: UploadPolicyPayload) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);
    // Let axios set the multipart boundary itself — do not set Content-Type manually.
    return apiClient.post<PolicyDocument>("/policies", formData).then((res) => res.data);
  },

  remove: (id: string) => apiClient.delete(`/policies/${id}`),
};
