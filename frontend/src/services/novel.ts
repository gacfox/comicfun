import { request } from "@/services/request";

export interface NovelListItem {
  id: number;
  title: string;
  desc: string;
  author: string;
  coverImgUrl: string;
  isCompleted: number;
  accessLevel: number;
  publishTime: string;
  volumeCount: number;
  chapterCount: number;
}

export interface ListNovelsResponse {
  items: NovelListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListNovelsParams {
  keyword?: string;
  tagIds?: number[];
  isComplete?: number;
  page?: number;
  pageSize?: number;
}

export interface CreateNovelRequest {
  title: string;
  desc?: string;
  author?: string;
  coverImgUrl?: string;
  isCompleted?: number;
  accessLevel?: number;
  publishTime?: string;
  tagIds?: number[];
}

export interface UpdateNovelRequest {
  title?: string;
  desc?: string;
  author?: string;
  coverImgUrl?: string;
  isCompleted?: number;
  accessLevel?: number;
  publishTime?: string;
  tagIds?: number[];
}

export interface NovelVolumeData {
  id: number;
  title: string;
  desc: string;
  displayOrder: number;
}

export interface NovelChapterData {
  id: number;
  title: string;
  content: string;
  displayOrder: number;
  publishTime: string;
}

export interface NovelTagData {
  id: number;
  name: string;
  isCatalog: number;
  tagImgUrl: string;
  displayOrder: number;
}

export interface NovelDetailResponse {
  id: number;
  title: string;
  desc: string;
  author: string;
  coverImgUrl: string;
  isCompleted: number;
  accessLevel: number;
  publishTime: string;
  volumes: NovelVolumeData[];
  tags: NovelTagData[];
}

export interface CreateVolumeRequest {
  title: string;
  desc?: string;
  displayOrder?: number;
}

export interface UpdateVolumeRequest {
  title?: string;
  desc?: string;
  displayOrder?: number;
}

export interface CreateChapterRequest {
  title: string;
  content?: string;
  displayOrder?: number;
  publishTime?: string;
}

export interface UpdateChapterRequest {
  title?: string;
  content?: string;
  displayOrder?: number;
  publishTime?: string;
}

export interface VolumeWithChapters {
  id: number;
  title: string;
  desc: string;
  displayOrder: number;
  chapters: NovelChapterData[];
}

export async function listNovels(params?: ListNovelsParams) {
  const searchParams = new URLSearchParams();
  if (params?.keyword) {
    searchParams.set("keyword", params.keyword);
  }
  if (params?.tagIds && params.tagIds.length > 0) {
    searchParams.set("tag_ids", params.tagIds.join(","));
  }
  if (params?.isComplete !== undefined) {
    searchParams.set("is_complete", params.isComplete.toString());
  }
  if (params?.page) {
    searchParams.set("page", params.page.toString());
  }
  if (params?.pageSize) {
    searchParams.set("page_size", params.pageSize.toString());
  }
  const query = searchParams.toString();
  return request<ListNovelsResponse>(
    `/api/novel/list${query ? `?${query}` : ""}`,
  );
}

export async function createNovel(data: CreateNovelRequest) {
  return request<{ id: number }>("/api/novel/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getNovel(id: number) {
  return request<NovelDetailResponse>(`/api/novel/get/${id}`);
}

export async function updateNovel(id: number, data: UpdateNovelRequest) {
  return request<null>(`/api/novel/update/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteNovel(id: number) {
  return request<null>(`/api/novel/delete/${id}`, {
    method: "DELETE",
  });
}

export async function listVolumes(novelId: number) {
  return request<NovelVolumeData[]>(`/api/novel/${novelId}/volumes`);
}

export async function createVolume(novelId: number, data: CreateVolumeRequest) {
  return request<NovelVolumeData>(`/api/novel/${novelId}/volume/create`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateVolume(
  volumeId: number,
  data: UpdateVolumeRequest,
) {
  return request<null>(`/api/novel/volume/${volumeId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteVolume(volumeId: number) {
  return request<null>(`/api/novel/volume/${volumeId}`, {
    method: "DELETE",
  });
}

export async function listChapters(volumeId: number) {
  return request<NovelChapterData[]>(`/api/novel/volume/${volumeId}/chapters`);
}

export async function getChapter(chapterId: number) {
  return request<NovelChapterData>(`/api/novel/chapter/${chapterId}`);
}

export async function createChapter(
  volumeId: number,
  data: CreateChapterRequest,
) {
  return request<NovelChapterData>(
    `/api/novel/volume/${volumeId}/chapter/create`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function updateChapter(
  chapterId: number,
  data: UpdateChapterRequest,
) {
  return request<null>(`/api/novel/chapter/${chapterId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteChapter(chapterId: number) {
  return request<null>(`/api/novel/chapter/${chapterId}`, {
    method: "DELETE",
  });
}

export async function getNovelStructure(novelId: number) {
  return request<VolumeWithChapters[]>(`/api/novel/${novelId}/structure`);
}

export function getNovelExportTxtUrl(novelId: number) {
  const token = localStorage.getItem("auth-storage");
  let tokenValue = "";
  if (token) {
    try {
      const parsed = JSON.parse(token);
      tokenValue = parsed.state?.token || "";
    } catch {}
  }
  return `/api/novel/${novelId}/export/txt?token=${encodeURIComponent(tokenValue)}`;
}
