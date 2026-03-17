import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowLeftCircle,
  ArrowRightCircle,
  List,
  Settings,
  Sun,
  Moon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getNovel, getNovelStructure, getChapter } from "@/services/novel";
import { updateHistory } from "@/services/history";
import type {
  NovelDetailResponse,
  VolumeWithChapters,
  NovelChapterData,
} from "@/services/novel";

type Theme = "light" | "sepia" | "dark";
type FontSize = "small" | "medium" | "large" | "xlarge";

const themeStyles: Record<Theme, React.CSSProperties> = {
  light: {
    backgroundColor: "#ffffff",
    color: "#1a1a1a",
  },
  sepia: {
    backgroundColor: "#f4ecd8",
    color: "#5c4b37",
  },
  dark: {
    backgroundColor: "#1a1a1a",
    color: "#e0e0e0",
  },
};

const fontSizeClasses: Record<FontSize, string> = {
  small: "text-base leading-relaxed",
  medium: "text-lg leading-relaxed",
  large: "text-xl leading-relaxed",
  xlarge: "text-2xl leading-relaxed",
};

export function NovelReaderPage() {
  const { novelId, volumeId, chapterId } = useParams<{
    novelId: string;
    volumeId: string;
    chapterId: string;
  }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [novel, setNovel] = useState<NovelDetailResponse | null>(null);
  const [structure, setStructure] = useState<VolumeWithChapters[]>([]);
  const [chapter, setChapter] = useState<NovelChapterData | null>(null);

  const [showToolbar, setShowToolbar] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("novel-reader-theme");
    return (saved as Theme) || "sepia";
  });
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem("novel-reader-fontsize");
    return (saved as FontSize) || "medium";
  });

  const currentNovelId = Number(novelId);
  const currentVolumeId = Number(volumeId);
  const currentChapterId = Number(chapterId);

  useEffect(() => {
    localStorage.setItem("novel-reader-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("novel-reader-fontsize", fontSize);
  }, [fontSize]);

  useEffect(() => {
    if (currentNovelId) {
      loadNovel();
    }
  }, [currentNovelId]);

  useEffect(() => {
    if (currentChapterId) {
      loadChapter();
    }
  }, [currentChapterId]);

  const loadNovel = async () => {
    const [novelRes, structureRes] = await Promise.all([
      getNovel(currentNovelId),
      getNovelStructure(currentNovelId),
    ]);

    if (novelRes.code === 0 && novelRes.data) {
      setNovel(novelRes.data);
    }

    if (structureRes.code === 0 && structureRes.data) {
      setStructure(structureRes.data);
    }
  };

  const loadChapter = async () => {
    setLoading(true);
    const res = await getChapter(currentChapterId);
    if (res.code === 0 && res.data) {
      setChapter(res.data);
      window.scrollTo(0, 0);
      if (
        Number.isFinite(currentNovelId) &&
        Number.isFinite(currentVolumeId) &&
        Number.isFinite(currentChapterId)
      ) {
        updateHistory({
          artifactId: currentNovelId,
          volumeId: currentVolumeId,
          chapterId: currentChapterId,
        });
      }
    }
    setLoading(false);
  };

  const getCurrentPosition = useCallback(() => {
    for (let vi = 0; vi < structure.length; vi++) {
      const volume = structure[vi];
      if (volume.id === currentVolumeId) {
        for (let ci = 0; ci < volume.chapters.length; ci++) {
          if (volume.chapters[ci].id === currentChapterId) {
            return { volumeIndex: vi, chapterIndex: ci };
          }
        }
      }
    }
    return null;
  }, [structure, currentVolumeId, currentChapterId]);

  const getPrevChapter = useCallback(() => {
    const pos = getCurrentPosition();
    if (!pos) return null;

    const { volumeIndex, chapterIndex } = pos;
    const currentVolume = structure[volumeIndex];
    if (!currentVolume) return null;

    if (chapterIndex > 0) {
      return currentVolume.chapters[chapterIndex - 1];
    }
    if (volumeIndex > 0) {
      const prevVolume = structure[volumeIndex - 1];
      if (prevVolume && prevVolume.chapters.length > 0) {
        return prevVolume.chapters[prevVolume.chapters.length - 1];
      }
    }
    return null;
  }, [structure, getCurrentPosition]);

  const getNextChapter = useCallback(() => {
    const pos = getCurrentPosition();
    if (!pos) return null;

    const { volumeIndex, chapterIndex } = pos;
    const volume = structure[volumeIndex];
    if (!volume) return null;

    if (chapterIndex < volume.chapters.length - 1) {
      return volume.chapters[chapterIndex + 1];
    }
    if (volumeIndex < structure.length - 1) {
      const nextVolume = structure[volumeIndex + 1];
      if (nextVolume && nextVolume.chapters.length > 0) {
        return nextVolume.chapters[0];
      }
    }
    return null;
  }, [structure, getCurrentPosition]);

  const handlePrevChapter = () => {
    const prev = getPrevChapter();
    if (prev) {
      const volume = structure.find((v) =>
        v.chapters.some((c) => c.id === prev.id),
      );
      if (volume) {
        navigate(`/read/novel/${currentNovelId}/${volume.id}/${prev.id}`);
      }
    }
  };

  const handleNextChapter = () => {
    const next = getNextChapter();
    if (next) {
      const volume = structure.find((v) =>
        v.chapters.some((c) => c.id === next.id),
      );
      if (volume) {
        navigate(`/read/novel/${currentNovelId}/${volume.id}/${next.id}`);
      }
    }
  };

  const handleChapterSelect = (volumeId: number, chapterId: number) => {
    setShowToc(false);
    navigate(`/read/novel/${currentNovelId}/${volumeId}/${chapterId}`);
  };

  const handleContentClick = () => {
    setShowToolbar(!showToolbar);
  };

  const renderToc = () => (
    <Sheet open={showToc} onOpenChange={setShowToc}>
      <SheetContent
        side="left"
        className="w-80 sm:w-96 max-w-[85vw] p-0"
        aria-describedby={undefined}
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-left">{novel?.title}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto h-[calc(100vh-60px)]">
          {structure.map((volume) => (
            <div key={volume.id}>
              <div className="px-4 py-2 bg-muted/50 text-sm font-medium sticky top-0">
                {volume.title}
              </div>
              {volume.chapters.map((ch) => (
                <div
                  key={ch.id}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-muted/50 ${
                    ch.id === currentChapterId
                      ? "bg-primary/10 text-primary"
                      : ""
                  }`}
                  onClick={() => handleChapterSelect(volume.id, ch.id)}
                >
                  {ch.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );

  const renderSettings = () => (
    <Sheet open={showSettings} onOpenChange={setShowSettings}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl gap-0"
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle>{t("reader.settings")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pt-0 pb-4 max-w-3xl mx-auto">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("reader.theme")}</label>
            <div className="flex gap-2">
              {(Object.keys(themeStyles) as Theme[]).map((themeKey) => (
                <Button
                  key={themeKey}
                  variant={theme === themeKey ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setTheme(themeKey)}
                >
                  {themeKey === "light" && <Sun className="w-4 h-4 mr-2" />}
                  {themeKey === "dark" && <Moon className="w-4 h-4 mr-2" />}
                  {themeKey === "sepia" && (
                    <span className="w-4 h-4 mr-2 bg-[#f4ecd8] rounded" />
                  )}
                  {t(
                    `reader.theme${themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}`,
                  )}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("reader.fontSize")}
            </label>
            <Select
              value={fontSize}
              onValueChange={(v) => setFontSize(v as FontSize)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">
                  {t("reader.fontSizeSmall")}
                </SelectItem>
                <SelectItem value="medium">
                  {t("reader.fontSizeMedium")}
                </SelectItem>
                <SelectItem value="large">
                  {t("reader.fontSizeLarge")}
                </SelectItem>
                <SelectItem value="xlarge">
                  {t("reader.fontSizeXLarge")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  if (loading && !chapter) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={themeStyles[theme]}
      >
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const prevChapter = getPrevChapter();
  const nextChapter = getNextChapter();

  return (
    <div className="min-h-screen" style={themeStyles[theme]}>
      {renderToc()}
      {renderSettings()}

      {showToolbar && (
        <header
          className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur"
          style={{
            backgroundColor: `color-mix(in srgb, ${themeStyles[theme].backgroundColor} 95%, transparent)`,
          }}
        >
          <div className="mx-auto w-full max-w-3xl lg:max-w-4xl px-4 sm:px-6 md:px-8 flex items-center justify-between h-14">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/detail/novel/${novelId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 text-center px-4 truncate text-sm font-medium">
              {chapter?.title}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowToc(true)}
            >
              <List className="h-5 w-5" />
            </Button>
          </div>
        </header>
      )}

      <main
        className={`mx-auto w-full max-w-3xl lg:max-w-4xl px-4 sm:px-6 md:px-8 py-20 pb-28 ${fontSizeClasses[fontSize]}`}
        onClick={handleContentClick}
      >
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6 text-center text-balance">
          {chapter?.title}
        </h1>
        <article className="whitespace-pre-wrap wrap-break-word">
          {chapter?.content}
        </article>

        <div className="flex items-center justify-between gap-3 py-8 border-t mt-8">
          <Button
            variant="ghost"
            disabled={!prevChapter}
            onClick={(e) => {
              e.stopPropagation();
              handlePrevChapter();
            }}
          >
            <ArrowLeftCircle className="h-5 w-5 mr-2" />
            {t("reader.prevChapter")}
          </Button>
          <Button
            variant="ghost"
            disabled={!nextChapter}
            onClick={(e) => {
              e.stopPropagation();
              handleNextChapter();
            }}
          >
            {t("reader.nextChapter")}
            <ArrowRightCircle className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </main>

      {showToolbar && (
        <footer
          className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur"
          style={{
            backgroundColor: `color-mix(in srgb, ${themeStyles[theme].backgroundColor} 95%, transparent)`,
          }}
        >
          <div className="mx-auto w-full max-w-3xl lg:max-w-4xl px-4 sm:px-6 md:px-8 flex items-center justify-around h-14">
            <Button
              variant="ghost"
              onClick={() => setShowToc(true)}
              className="h-10 px-3 flex-col gap-0.5"
            >
              <List className="h-5 w-5" />
              <span className="text-xs">{t("reader.toc")}</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowSettings(true)}
              className="h-10 px-3 flex-col gap-0.5"
            >
              <Settings className="h-5 w-5" />
              <span className="text-xs">{t("reader.settings")}</span>
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
