import type { ApiResponse } from "@/services/types";
import { useAuthStore } from "@/stores";

interface UploadResponse {
  url: string;
}

async function uploadFile(
  file: File,
  endpoint: string,
): Promise<ApiResponse<UploadResponse>> {
  const formData = new FormData();
  formData.append("file", file);

  const token = useAuthStore.getState().token;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  return response.json();
}

export async function uploadTagImage(file: File) {
  return uploadFile(file, "/api/upload/tag-image");
}

export async function uploadAvatar(file: File) {
  return uploadFile(file, "/api/upload/avatar");
}

export async function uploadCover(file: File) {
  return uploadFile(file, "/api/upload/cover");
}

export async function uploadComicPage(
  file: File,
  artifactId: number,
  volumeId: number,
  chapterId: number,
) {
  return uploadFile(
    file,
    `/api/upload/comic-page/${artifactId}/${volumeId}/${chapterId}`,
  );
}

export async function uploadVideo(
  file: File,
  artifactId: number,
  volumeId: number,
  chapterId: number,
) {
  return uploadFile(
    file,
    `/api/upload/video/${artifactId}/${volumeId}/${chapterId}`,
  );
}
