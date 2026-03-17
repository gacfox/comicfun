import { request } from "@/services/request";

export interface AnimationListItem {
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

export interface AnimationListResponse {
  items: AnimationListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListAnimationsParams {
  keyword?: string;
  tagIds?: number[];
  isComplete?: number;
  page?: number;
  pageSize?: number;
}

export interface CreateAnimationRequest {
  title: string;
  desc?: string;
  author?: string;
  coverImgUrl?: string;
  isCompleted?: number;
  accessLevel?: number;
  publishTime?: string;
  tagIds?: number[];
}

export interface UpdateAnimationRequest {
  title?: string;
  desc?: string;
  author?: string;
  coverImgUrl?: string;
  isCompleted?: number;
  accessLevel?: number;
  publishTime?: string;
  tagIds?: number[];
}

export interface AnimationVolumeData {
  id: number;
  title: string;
  desc: string;
  displayOrder: number;
}

export interface AnimationChapterData {
  id: number;
  title: string;
  videoUrl: string;
  displayOrder: number;
  publishTime: string;
}

export interface AnimationTagData {
  id: number;
  name: string;
  isCatalog: number;
  tagImgUrl: string;
  displayOrder: number;
}

export interface AnimationDetailResponse {
  id: number;
  title: string;
  desc: string;
  author: string;
  coverImgUrl: string;
  isCompleted: number;
  accessLevel: number;
  publishTime: string;
  volumes: AnimationVolumeData[];
  tags: AnimationTagData[];
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
  videoUrl?: string;
  displayOrder?: number;
  publishTime?: string;
}

export interface UpdateChapterRequest {
  title?: string;
  videoUrl?: string;
  displayOrder?: number;
  publishTime?: string;
}

export interface AnimationVolumeWithChapters {
  id: number;
  title: string;
  desc: string;
  displayOrder: number;
  chapters: AnimationChapterData[];
}

export async function listAnimations(params?: ListAnimationsParams) {
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
  return request<AnimationListResponse>(
    `/api/animation/list${query ? `?${query}` : ""}`,
  );
}

export async function createAnimation(data: CreateAnimationRequest) {
  return request<{ id: number }>("/api/animation/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getAnimation(id: number) {
  return request<AnimationDetailResponse>(`/api/animation/get/${id}`);
}

export async function updateAnimation(
  id: number,
  data: UpdateAnimationRequest,
) {
  return request<null>(`/api/animation/update/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAnimation(id: number) {
  return request<null>(`/api/animation/delete/${id}`, {
    method: "DELETE",
  });
}

export async function getAnimationStructure(id: number) {
  return request<AnimationVolumeWithChapters[]>(
    `/api/animation/${id}/structure`,
  );
}

export async function createAnimationVolume(
  animationId: number,
  data: CreateVolumeRequest,
) {
  return request<AnimationVolumeData>(
    `/api/animation/${animationId}/volume/create`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function updateAnimationVolume(
  volumeId: number,
  data: UpdateVolumeRequest,
) {
  return request<null>(`/api/animation/volume/${volumeId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAnimationVolume(volumeId: number) {
  return request<null>(`/api/animation/volume/${volumeId}`, {
    method: "DELETE",
  });
}

export async function getAnimationChapter(chapterId: number) {
  return request<AnimationChapterData>(`/api/animation/chapter/${chapterId}`);
}

export async function createAnimationChapter(
  volumeId: number,
  data: CreateChapterRequest,
) {
  return request<AnimationChapterData>(
    `/api/animation/volume/${volumeId}/chapter/create`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function updateAnimationChapter(
  chapterId: number,
  data: UpdateChapterRequest,
) {
  return request<null>(`/api/animation/chapter/${chapterId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAnimationChapter(chapterId: number) {
  return request<null>(`/api/animation/chapter/${chapterId}`, {
    method: "DELETE",
  });
}

export function getAnimationExportUrl(animationId: number, chapterId: number) {
  let token = "";
  try {
    const stored = localStorage.getItem("auth-storage");
    if (stored) {
      const parsed = JSON.parse(stored);
      token = parsed?.state?.token || "";
    }
  } catch {
    // ignore
  }
  return `/api/animation/${animationId}/export?chapter_id=${chapterId}&token=${token}`;
}
