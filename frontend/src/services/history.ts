import { request } from "@/services/request";

export interface UpdateHistoryRequest {
  artifactId: number;
  volumeId: number;
  chapterId: number;
  position?: number;
}

export interface HistoryData {
  volumeId: number;
  chapterId: number;
  position: number;
}

export interface HistoryItem {
  id: number;
  artifactId: number;
  contentType: number;
  title: string;
  coverImgUrl: string;
  volumeId: number;
  chapterId: number;
  chapterTitle: string;
  position: number;
  updateTime: string;
}

export interface HistoryListData {
  items: HistoryItem[];
  total: number;
}

export async function updateHistory(data: UpdateHistoryRequest) {
  return request<null>("/api/history/update", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getHistory(artifactId: number) {
  return request<HistoryData>(`/api/history/get/${artifactId}`);
}

export async function listHistory() {
  return request<HistoryListData>("/api/history/list");
}

export async function deleteHistory(artifactId: number) {
  return request<null>(`/api/history/delete/${artifactId}`, {
    method: "DELETE",
  });
}

export async function clearHistory() {
  return request<null>("/api/history/clear", {
    method: "DELETE",
  });
}
