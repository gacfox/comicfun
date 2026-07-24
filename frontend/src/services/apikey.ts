import { request } from "@/services/request";

export interface APIKeyData {
  id: number;
  name: string;
  create_time: string;
  last_used_time?: string;
  revoked: number;
}

export interface CreateAPIKeyResponse {
  id: number;
  name: string;
  token: string;
}

export async function createAPIKey(name: string) {
  return request<CreateAPIKeyResponse>("/api/apikey/create", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function listAPIKeys() {
  return request<APIKeyData[]>("/api/apikey/list");
}

export async function revokeAPIKey(id: number) {
  return request<null>(`/api/apikey/revoke/${id}`, {
    method: "DELETE",
  });
}
