import { request } from "@/services/request";
import type { LoginData } from "@/services/types";

export async function init(username: string, password: string) {
  return request<LoginData>("/api/user/init", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function login(username: string, password: string) {
  return request<LoginData>("/api/user/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}
