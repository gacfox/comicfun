import { request } from "@/services/request";
import type { UserData } from "@/services/types";

export interface ListUsersData {
  items: UserData[];
  total: number;
}

export interface CreateUserRequest {
  username: string;
  displayUsername?: string;
  isAdmin?: number;
}

export interface CreateUserResponse {
  user: UserData;
  password: string;
}

export interface UpdateUserRequest {
  displayUsername?: string;
  isAdmin?: number;
}

export interface ResetPasswordResponse {
  password: string;
}

export async function getMe() {
  return request<UserData>("/api/user/me");
}

export interface UpdateProfileRequest {
  displayUsername: string;
  avatarUrl: string;
}

export async function updateProfile(data: UpdateProfileRequest) {
  return request<UserData>("/api/user/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export interface UpdatePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export async function updatePassword(data: UpdatePasswordRequest) {
  return request<null>("/api/user/password", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function listUsers() {
  return request<ListUsersData>("/api/user/list");
}

export async function createUser(data: CreateUserRequest) {
  return request<CreateUserResponse>("/api/user/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: number, data: UpdateUserRequest) {
  return request<UserData>(`/api/user/update/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: number) {
  return request<null>(`/api/user/delete/${id}`, {
    method: "DELETE",
  });
}

export async function resetPassword(id: number) {
  return request<ResetPasswordResponse>(`/api/user/reset-password/${id}`, {
    method: "POST",
  });
}
