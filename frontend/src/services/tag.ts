import { request } from "@/services/request";

export interface TagData {
  id: number;
  name: string;
  isCatalog: number;
  tagImgUrl: string;
  displayOrder: number;
}

export interface CreateTagRequest {
  name: string;
  isCatalog?: number;
  tagImgUrl?: string;
  displayOrder?: number;
}

export interface UpdateTagRequest {
  name?: string;
  isCatalog?: number;
  tagImgUrl?: string;
  displayOrder?: number;
}

export async function listTags() {
  return request<TagData[]>("/api/tag/list");
}

export async function getTag(id: number) {
  return request<TagData>(`/api/tag/get/${id}`);
}

export async function createTag(data: CreateTagRequest) {
  return request<TagData>("/api/tag/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTag(id: number, data: UpdateTagRequest) {
  return request<TagData>(`/api/tag/update/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTag(id: number) {
  return request<null>(`/api/tag/delete/${id}`, {
    method: "DELETE",
  });
}
