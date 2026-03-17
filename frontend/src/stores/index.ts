import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserData } from "@/services/types";

interface AuthState {
  token: string | null;
  user: UserData | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: UserData) => void;
  updateUser: (user: UserData) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      updateUser: (user) => set({ user }),
      clearAuth: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

interface LanguageState {
  language: string;
  setLanguage: (language: string) => void;
}

function getBrowserLanguage(): string {
  if (typeof window !== "undefined") {
    const browserLang = navigator.language;
    if (browserLang.startsWith("zh")) {
      return "zh-CN";
    }
  }
  return "en-US";
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: getBrowserLanguage(),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "language-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ language: state.language }),
    },
  ),
);

interface SystemState {
  isInitialized: boolean | null;
  setInitialized: (value: boolean) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  isInitialized: null,
  setInitialized: (value) => set({ isInitialized: value }),
}));
