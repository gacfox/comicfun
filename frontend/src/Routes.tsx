import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { InitPage } from "@/pages/InitPage";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { ReadingPage } from "@/pages/ReadingPage";
import { TagsPage } from "@/pages/TagsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { UsersPage } from "@/pages/UsersPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { BookmarkPage } from "@/pages/BookmarkPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { NovelListPage } from "@/pages/NovelListPage";
import { NovelEditPage } from "@/pages/NovelEditPage";
import { ComicListPage } from "@/pages/ComicListPage";
import { ComicEditPage } from "@/pages/ComicEditPage";
import { AnimationListPage } from "@/pages/AnimationListPage";
import { AnimationEditPage } from "@/pages/AnimationEditPage";
import { ArtifactDetailPage } from "@/pages/ArtifactDetailPage";
import { NovelReaderPage } from "@/pages/NovelReaderPage";
import { ComicReaderPage } from "@/pages/ComicReaderPage";
import { AnimationPlayerPage } from "@/pages/AnimationPlayerPage";
import { useAuthStore } from "@/stores";

export function RoutesView() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  const requireAuth = (element: React.ReactElement) =>
    isAuthenticated ? (
      element
    ) : (
      <Navigate to="/login" state={{ from: location }} replace />
    );

  return (
    <Routes>
      <Route path="/init" element={<InitPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={requireAuth(<HomePage />)} />
      <Route path="/reading" element={requireAuth(<ReadingPage />)} />
      <Route path="/tags" element={requireAuth(<TagsPage />)} />
      <Route path="/users" element={requireAuth(<UsersPage />)} />
      <Route path="/settings" element={requireAuth(<SettingsPage />)} />
      <Route path="/profile" element={requireAuth(<ProfilePage />)} />
      <Route path="/bookmark" element={requireAuth(<BookmarkPage />)} />
      <Route path="/history" element={requireAuth(<HistoryPage />)} />
      <Route path="/novel" element={requireAuth(<NovelListPage />)} />
      <Route path="/novel/:id" element={requireAuth(<NovelEditPage />)} />
      <Route path="/comic" element={requireAuth(<ComicListPage />)} />
      <Route path="/comic/:id" element={requireAuth(<ComicEditPage />)} />
      <Route path="/animation" element={requireAuth(<AnimationListPage />)} />
      <Route
        path="/animation/:id"
        element={requireAuth(<AnimationEditPage />)}
      />
      <Route
        path="/detail/:type/:id"
        element={requireAuth(<ArtifactDetailPage />)}
      />
      <Route
        path="/read/novel/:novelId/:volumeId/:chapterId"
        element={requireAuth(<NovelReaderPage />)}
      />
      <Route
        path="/read/comic/:comicId/:volumeId/:chapterId"
        element={requireAuth(<ComicReaderPage />)}
      />
      <Route
        path="/read/animation/:animationId/:volumeId/:chapterId"
        element={requireAuth(<AnimationPlayerPage />)}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
