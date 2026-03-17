import { request } from "@/services/request";

export interface ComicListItem {
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

export interface ListComicsResponse {
  items: ComicListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListComicsParams {
  keyword?: string;
  tagIds?: number[];
  isComplete?: number;
  page?: number;
  pageSize?: number;
}

export interface CreateComicRequest {
  title: string;
  desc?: string;
  author?: string;
  coverImgUrl?: string;
  isCompleted?: number;
  accessLevel?: number;
  publishTime?: string;
  tagIds?: number[];
}

export interface UpdateComicRequest {
  title?: string;
  desc?: string;
  author?: string;
  coverImgUrl?: string;
  isCompleted?: number;
  accessLevel?: number;
  publishTime?: string;
  tagIds?: number[];
}

export interface ComicVolumeData {
  id: number;
  title: string;
  desc: string;
  displayOrder: number;
}

export interface ComicChapterData {
  id: number;
  title: string;
  splitType: number;
  colorType: number;
  displayOrder: number;
  publishTime: string;
}

export interface ComicPageData {
  id: number;
  imageUrl: string;
  displayOrder: number;
}

export interface ComicTagData {
  id: number;
  name: string;
  isCatalog: number;
  tagImgUrl: string;
  displayOrder: number;
}

export interface ComicChapterWithPages extends ComicChapterData {
  pages: ComicPageData[];
}

export interface ComicVolumeWithChapters extends ComicVolumeData {
  chapters: ComicChapterWithPages[];
}

export interface ComicDetailResponse {
  id: number;
  title: string;
  desc: string;
  author: string;
  coverImgUrl: string;
  isCompleted: number;
  accessLevel: number;
  publishTime: string;
  volumes: ComicVolumeData[];
  tags: ComicTagData[];
}

export interface CreateVolumeRequest {
  title: string;
  desc?: string;
}

export interface UpdateVolumeRequest {
  title?: string;
  desc?: string;
}

export interface CreateChapterRequest {
  title: string;
  splitType?: number;
  colorType?: number;
  publishTime?: string;
}

export interface UpdateChapterRequest {
  title?: string;
  splitType?: number;
  colorType?: number;
  publishTime?: string;
}

export interface CreatePageRequest {
  imageUrl: string;
}

export interface UpdatePageRequest {
  imageUrl?: string;
}

export async function listComics(params?: ListComicsParams) {
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
  return request<ListComicsResponse>(
    `/api/comic/list${query ? `?${query}` : ""}`,
  );
}

export async function createComic(data: CreateComicRequest) {
  return request<{ id: number }>("/api/comic/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getComic(id: number) {
  return request<ComicDetailResponse>(`/api/comic/get/${id}`);
}

export async function updateComic(id: number, data: UpdateComicRequest) {
  return request<null>(`/api/comic/update/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteComic(id: number) {
  return request<null>(`/api/comic/delete/${id}`, {
    method: "DELETE",
  });
}

export async function getComicStructure(id: number) {
  return request<ComicVolumeWithChapters[]>(`/api/comic/${id}/structure`);
}

export async function listComicVolumes(comicId: number) {
  return request<ComicVolumeData[]>(`/api/comic/${comicId}/volumes`);
}

export async function createComicVolume(
  comicId: number,
  data: CreateVolumeRequest,
) {
  return request<ComicVolumeData>(`/api/comic/${comicId}/volume/create`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateComicVolume(
  volumeId: number,
  data: UpdateVolumeRequest,
) {
  return request<null>(`/api/comic/volume/${volumeId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteComicVolume(volumeId: number) {
  return request<null>(`/api/comic/volume/${volumeId}`, {
    method: "DELETE",
  });
}

export async function listComicChapters(volumeId: number) {
  return request<ComicChapterData[]>(`/api/comic/volume/${volumeId}/chapters`);
}

export async function getComicChapter(chapterId: number) {
  return request<ComicChapterData>(`/api/comic/chapter/${chapterId}`);
}

export async function createComicChapter(
  volumeId: number,
  data: CreateChapterRequest,
) {
  return request<ComicChapterData>(
    `/api/comic/volume/${volumeId}/chapter/create`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function updateComicChapter(
  chapterId: number,
  data: UpdateChapterRequest,
) {
  return request<null>(`/api/comic/chapter/${chapterId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteComicChapter(chapterId: number) {
  return request<null>(`/api/comic/chapter/${chapterId}`, {
    method: "DELETE",
  });
}

export async function listComicPages(chapterId: number) {
  return request<ComicPageData[]>(`/api/comic/chapter/${chapterId}/pages`);
}

export async function createComicPage(
  chapterId: number,
  data: CreatePageRequest,
) {
  return request<ComicPageData>(`/api/comic/chapter/${chapterId}/page/create`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateComicPage(pageId: number, data: UpdatePageRequest) {
  return request<null>(`/api/comic/page/${pageId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteComicPage(pageId: number) {
  return request<null>(`/api/comic/page/${pageId}`, {
    method: "DELETE",
  });
}

export async function moveComicPage(pageId: number, direction: "up" | "down") {
  return request<null>(`/api/comic/page/${pageId}/move`, {
    method: "POST",
    body: JSON.stringify({ direction }),
  });
}

export async function batchCreateComicPages(
  chapterId: number,
  imageUrls: string[],
) {
  return request<ComicPageData[]>(
    `/api/comic/chapter/${chapterId}/pages/batch`,
    {
      method: "POST",
      body: JSON.stringify({ imageUrls }),
    },
  );
}

export function getComicExportUrl(
  comicId: number,
  chapterId: number,
  format: "zip" | "cbz",
) {
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
  return `/api/comic/${comicId}/export?chapter_id=${chapterId}&format=${format}&token=${token}`;
}
