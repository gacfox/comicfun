import { request } from "@/services/request";
import type { ApiResponse } from "@/services/types";

export interface User {
  id: number;
  username: string;
  displayUsername: string;
  avatarUrl?: string;
  isAdmin: number;
  createTime: string;
}

export interface ACLUsersResponse {
  users: User[];
}

export interface RegularUsersResponse {
  users: User[];
}

export interface UpdateACLRequest {
  user_ids: number[];
}

export async function getArtifactACL(
  artifactId: string,
): Promise<ApiResponse<ACLUsersResponse>> {
  return request(`/api/acl/artifact/${artifactId}`);
}

export async function updateArtifactACL(
  artifactId: string,
  userIds: number[],
): Promise<ApiResponse<void>> {
  return request(`/api/acl/artifact/${artifactId}`, {
    method: "PUT",
    body: JSON.stringify({ user_ids: userIds }),
  });
}

export async function getRegularUsers(): Promise<
  ApiResponse<RegularUsersResponse>
> {
  return request("/api/acl/users");
}
