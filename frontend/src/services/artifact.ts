import { request } from "@/services/request";
import type { ApiResponse } from "@/services/types";

export interface ArtifactListItem {
  id: number;
  contentType: number;
  title: string;
  coverImgUrl: string;
  isCompleted: number;
  publishTime: string;
}

export interface ArtifactListData {
  items: ArtifactListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ArtifactListParams {
  keyword?: string;
  tagIds?: number[];
  excludeTagIds?: number[];
  contentType?: number;
  isComplete?: number;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listArtifacts(
  params: ArtifactListParams = {},
): Promise<ApiResponse<ArtifactListData>> {
  const searchParams = new URLSearchParams();

  if (params.keyword) {
    searchParams.set("keyword", params.keyword);
  }
  if (params.tagIds && params.tagIds.length > 0) {
    searchParams.set("tag_ids", params.tagIds.join(","));
  }
  if (params.excludeTagIds && params.excludeTagIds.length > 0) {
    searchParams.set("exclude_tag_ids", params.excludeTagIds.join(","));
  }
  if (params.contentType) {
    searchParams.set("content_type", params.contentType.toString());
  }
  if (params.isComplete !== undefined) {
    searchParams.set("is_complete", params.isComplete.toString());
  }
  if (params.sortOrder) {
    searchParams.set("sort_order", params.sortOrder);
  }
  if (params.page) {
    searchParams.set("page", params.page.toString());
  }
  if (params.pageSize) {
    searchParams.set("page_size", params.pageSize.toString());
  }

  const queryString = searchParams.toString();
  const endpoint = queryString
    ? `/api/artifact/list?${queryString}`
    : "/api/artifact/list";

  return request<ArtifactListData>(endpoint);
}
