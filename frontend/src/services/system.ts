import { request } from "@/services/request";
import type { SystemData, StatisticsData } from "@/services/types";

export async function checkSystemInitialized() {
  return request<SystemData>("/api/system/check");
}

export async function getStatistics() {
  return request<StatisticsData>("/api/system/statistics");
}
