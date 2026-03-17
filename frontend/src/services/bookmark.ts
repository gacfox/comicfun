import { request } from "@/services/request";

export interface BookmarkItem {
  bookmarkId: number;
  createTime: string;
  artifactId: number;
  contentType: number;
  title: string;
  coverImgUrl: string;
  isCompleted: number;
  publishTime: string;
}

export interface BookmarkListData {
  items: BookmarkItem[];
}

export interface BookmarkStatusData {
  bookmarked: boolean;
}

export async function listBookmarks() {
  return request<BookmarkListData>("/api/bookmark/list");
}

export async function getBookmarkStatus(artifactId: number) {
  return request<BookmarkStatusData>(`/api/bookmark/status/${artifactId}`);
}

export async function addBookmark(artifactId: number) {
  return request<null>("/api/bookmark/add", {
    method: "POST",
    body: JSON.stringify({ artifactId }),
  });
}

export async function removeBookmark(artifactId: number) {
  return request<null>(`/api/bookmark/remove/${artifactId}`, {
    method: "DELETE",
  });
}
