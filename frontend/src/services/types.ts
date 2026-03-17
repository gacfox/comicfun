export interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
}

export interface UserData {
  id: number;
  username: string;
  displayUsername: string;
  avatarUrl: string;
  isAdmin: number;
}

export interface LoginData {
  token: string;
  user: UserData;
}

export interface HealthData {
  status: string;
  timestamp: string;
}

export interface SystemData {
  initialized: boolean;
}

export interface StatisticsData {
  novelCount: number;
  comicCount: number;
  animationCount: number;
  userCount: number;
}
