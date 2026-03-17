import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Virtuoso } from "react-virtuoso";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  List,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getComic, getComicStructure } from "@/services/comic";
import { updateHistory } from "@/services/history";
import type {
  ComicVolumeWithChapters,
  ComicChapterWithPages,
} from "@/services/comic";

type ReadMode = "page" | "strip";

export function ComicReaderPage() {
  const { comicId, volumeId, chapterId } = useParams<{
    comicId: string;
    volumeId: string;
    chapterId: string;
  }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [comic, setComic] = useState<{ title: string } | null>(null);
  const [structure, setStructure] = useState<ComicVolumeWithChapters[]>([]);
  const [chapter, setChapter] = useState<ComicChapterWithPages | null>(null);

  const [showToolbar, setShowToolbar] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [readMode, setReadMode] = useState<ReadMode>("page");
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });

  const currentComicId = Number(comicId);
  const currentVolumeId = Number(volumeId);
  const currentChapterId = Number(chapterId);

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const zoomOffsetRef = useRef({ x: 0, y: 0 });
  const zoomScaleRef = useRef(1);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const suppressClickRef = useRef(false);
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (currentComicId) {
      loadComic();
    }
  }, [currentComicId]);

  useEffect(() => {
    if (currentChapterId && structure.length > 0) {
      loadChapter();
    }
  }, [currentChapterId, structure]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readMode === "page") {
        if (e.key === "ArrowLeft" || e.key === "a") {
          handlePrevPage();
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === " ") {
          handleNextPage();
        }
      }
      if (e.key === "Escape") {
        if (isFullscreen) {
          document.exitFullscreen();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readMode, currentPageIndex, chapter, isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
    zoomOffsetRef.current = { x: 0, y: 0 };
    zoomScaleRef.current = 1;
    pointersRef.current.clear();
    dragStartRef.current = null;
    pinchStartDistanceRef.current = null;
  }, [readMode, currentPageIndex, currentChapterId]);

  useEffect(() => {
    zoomScaleRef.current = zoomScale;
  }, [zoomScale]);

  useEffect(() => {
    zoomOffsetRef.current = zoomOffset;
  }, [zoomOffset]);

  useEffect(() => {
    const handleWheelNative = (e: WheelEvent) => {
      if (readMode !== "page") return;
      if (!e.ctrlKey) return;
      const container = containerRef.current;
      if (!container || !container.contains(e.target as Node)) return;

      e.preventDefault();
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.1 : 0.9;
      const nextScale = Math.min(4, Math.max(1, zoomScaleRef.current * factor));
      setZoomScale(nextScale);
      if (nextScale === 1) {
        const resetOffset = { x: 0, y: 0 };
        setZoomOffset(resetOffset);
        zoomOffsetRef.current = resetOffset;
      }
    };

    window.addEventListener("wheel", handleWheelNative, {
      passive: false,
      capture: true,
    });
    return () =>
      window.removeEventListener("wheel", handleWheelNative, {
        capture: true,
      } as AddEventListenerOptions);
  }, [readMode]);

  const loadComic = async () => {
    const [comicRes, structureRes] = await Promise.all([
      getComic(currentComicId),
      getComicStructure(currentComicId),
    ]);

    if (comicRes.code === 0 && comicRes.data) {
      setComic(comicRes.data);
    }

    if (structureRes.code === 0 && structureRes.data) {
      setStructure(structureRes.data);
    }
  };

  const loadChapter = () => {
    for (const volume of structure) {
      const found = volume.chapters.find((c) => c.id === currentChapterId);
      if (found) {
        setChapter(found);
        setCurrentPageIndex(0);
        setLoading(false);
        if (
          Number.isFinite(currentComicId) &&
          Number.isFinite(currentVolumeId) &&
          Number.isFinite(currentChapterId)
        ) {
          updateHistory({
            artifactId: currentComicId,
            volumeId: currentVolumeId,
            chapterId: currentChapterId,
          });
        }
        return;
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
    if (chapterIndex > 0) {
      return structure[volumeIndex].chapters[chapterIndex - 1];
    }
    if (volumeIndex > 0) {
      const prevVolume = structure[volumeIndex - 1];
      if (prevVolume.chapters.length > 0) {
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
    if (chapterIndex < volume.chapters.length - 1) {
      return volume.chapters[chapterIndex + 1];
    }
    if (volumeIndex < structure.length - 1) {
      const nextVolume = structure[volumeIndex + 1];
      if (nextVolume.chapters.length > 0) {
        return nextVolume.chapters[0];
      }
    }
    return null;
  }, [structure, getCurrentPosition]);

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const handleNextPage = () => {
    if (chapter && currentPageIndex < chapter.pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    } else {
      handleNextChapter();
    }
  };

  const handlePrevChapter = () => {
    const prev = getPrevChapter();
    if (prev) {
      const volume = structure.find((v) =>
        v.chapters.some((c) => c.id === prev.id),
      );
      if (volume) {
        navigate(`/read/comic/${currentComicId}/${volume.id}/${prev.id}`);
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
        navigate(`/read/comic/${currentComicId}/${volume.id}/${next.id}`);
      }
    }
  };

  const handleChapterSelect = (volumeId: number, chapterId: number) => {
    setShowToc(false);
    navigate(`/read/comic/${currentComicId}/${volumeId}/${chapterId}`);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const handlePageClick = (e: React.MouseEvent) => {
    if (readMode !== "page") return;
    if (zoomScale !== 1 || suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) {
      handlePrevPage();
    } else if (x > (width * 2) / 3) {
      handleNextPage();
    } else {
      setShowToolbar(!showToolbar);
    }
  };

  const resetZoom = () => {
    setZoomScale(1);
    const resetOffset = { x: 0, y: 0 };
    setZoomOffset(resetOffset);
    zoomOffsetRef.current = resetOffset;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readMode !== "page") return;

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    if (zoomScaleRef.current > 1) {
      e.preventDefault();
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      dragOriginRef.current = { ...zoomOffsetRef.current };
      suppressClickRef.current = false;
    }

    if (pointersRef.current.size === 2) {
      const [p1, p2] = Array.from(pointersRef.current.values());
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      pinchStartDistanceRef.current = Math.hypot(dx, dy);
      pinchStartScaleRef.current = zoomScale;
      suppressClickRef.current = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readMode !== "page") return;
    if (!pointersRef.current.has(e.pointerId)) return;

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchStartDistanceRef.current) {
      const [p1, p2] = Array.from(pointersRef.current.values());
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const distance = Math.hypot(dx, dy);
      const scale =
        pinchStartScaleRef.current * (distance / pinchStartDistanceRef.current);
      const nextScale = Math.min(4, Math.max(1, scale));
      setZoomScale(nextScale);
      if (nextScale > 1) {
        suppressClickRef.current = true;
      }
      e.preventDefault();
      return;
    }

    if (
      pointersRef.current.size === 1 &&
      dragStartRef.current &&
      zoomScale > 1
    ) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        suppressClickRef.current = true;
      }
      const nextOffset = {
        x: dragOriginRef.current.x + dx,
        y: dragOriginRef.current.y + dy,
      };
      setZoomOffset(nextOffset);
      e.preventDefault();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readMode !== "page") return;

    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size < 2) {
      pinchStartDistanceRef.current = null;
    }

    if (pointersRef.current.size === 1) {
      const [remaining] = Array.from(pointersRef.current.values());
      dragStartRef.current = { x: remaining.x, y: remaining.y };
      dragOriginRef.current = { ...zoomOffsetRef.current };
    }

    if (pointersRef.current.size === 0) {
      dragStartRef.current = null;

      if (e.pointerType === "touch") {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          resetZoom();
          suppressClickRef.current = true;
        }
        lastTapRef.current = now;
      }
    }
  };

  const handleDoubleClick = () => {
    if (readMode !== "page") return;
    resetZoom();
    suppressClickRef.current = true;
  };

  const renderToc = () => (
    <Sheet open={showToc} onOpenChange={setShowToc}>
      <SheetContent
        side="left"
        className="w-80 p-0"
        aria-describedby={undefined}
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-left">{comic?.title}</SheetTitle>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!chapter || !chapter.pages || chapter.pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
        <p className="mb-4">{t("common.noData")}</p>
        <Button
          variant="outline"
          onClick={() => navigate(`/detail/comic/${comicId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-black overflow-hidden">
      {renderToc()}

      {showToolbar && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur">
          <div className="flex items-center justify-between h-14 px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/detail/comic/${comicId}`)}
              className="text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 text-center px-4 truncate text-sm font-medium text-white">
              {chapter.title}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setReadMode(readMode === "page" ? "strip" : "page")
                }
                className="text-white text-xs"
              >
                {readMode === "page"
                  ? t("reader.stripMode")
                  : t("reader.pageMode")}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowToc(true)}
                className="text-white"
              >
                <List className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>
      )}

      {readMode === "page" ? (
        <div
          className="flex items-center justify-center min-h-screen cursor-pointer select-none touch-none"
          onClick={handlePageClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={chapter.pages[currentPageIndex]?.imageUrl}
            alt={`Page ${currentPageIndex + 1}`}
            className="max-w-full max-h-[calc(100vh-7rem)] object-contain will-change-transform"
            style={{
              transform: `translate3d(${zoomOffset.x}px, ${zoomOffset.y}px, 0) scale(${zoomScale})`,
              cursor: zoomScale > 1 ? "grab" : "inherit",
            }}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />

          {showToolbar && (
            <>
              {currentPageIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevPage();
                  }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}
              {currentPageIndex < chapter.pages.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextPage();
                  }}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <Virtuoso
          style={{
            height: "100vh",
            paddingTop: "3.5rem",
            paddingBottom: "4rem",
          }}
          totalCount={chapter.pages.length}
          defaultItemHeight={800}
          overscan={5}
          itemContent={(index) => (
            <div
              style={{ minHeight: 200 }}
              className="cursor-pointer"
              onClick={() => setShowToolbar(!showToolbar)}
            >
              <img
                src={chapter.pages[index]?.imageUrl}
                alt={`Page ${index + 1}`}
                className="w-full"
              />
            </div>
          )}
        />
      )}

      {showToolbar && (
        <footer className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur">
          <div className="flex items-center justify-between h-14 px-4">
            <Button
              variant="ghost"
              disabled={!getPrevChapter()}
              onClick={handlePrevChapter}
              className="text-white"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("reader.prevChapter")}
            </Button>

            {readMode === "page" && (
              <span className="text-white text-sm">
                {currentPageIndex + 1} / {chapter.pages.length}
              </span>
            )}

            <Button
              variant="ghost"
              disabled={!getNextChapter()}
              onClick={handleNextChapter}
              className="text-white"
            >
              {t("reader.nextChapter")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
