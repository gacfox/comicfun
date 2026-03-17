import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Loader2,
  BookOpen,
  Image,
  Film,
  Play,
  Clock,
  Tag as TagIcon,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getNovel,
  getNovelStructure,
  getNovelExportTxtUrl,
} from "@/services/novel";
import {
  getComic,
  getComicStructure,
  getComicExportUrl,
} from "@/services/comic";
import {
  getAnimation,
  getAnimationStructure,
  getAnimationExportUrl,
} from "@/services/animation";
import {
  addBookmark,
  getBookmarkStatus,
  removeBookmark,
} from "@/services/bookmark";
import { getHistory } from "@/services/history";
import type { VolumeWithChapters as NovelVolumeWithChapters } from "@/services/novel";
import type { ComicVolumeWithChapters } from "@/services/comic";
import type { AnimationVolumeWithChapters } from "@/services/animation";
import type { HistoryData } from "@/services/history";

type ContentType = "novel" | "comic" | "animation";

interface CommonDetail {
  id: number;
  title: string;
  desc: string;
  author: string;
  coverImgUrl: string;
  isCompleted: number;
  accessLevel: number;
  publishTime: string;
  tags: { id: number; name: string }[];
}

function getContentTypeLabel(t: (key: string) => string, type: ContentType) {
  switch (type) {
    case "novel":
      return t("reading.contentType.novel");
    case "comic":
      return t("reading.contentType.comic");
    case "animation":
      return t("reading.contentType.animation");
    default:
      return "";
  }
}

function getContentTypeIcon(type: ContentType) {
  switch (type) {
    case "novel":
      return <BookOpen className="w-5 h-5" />;
    case "comic":
      return <Image className="w-5 h-5" />;
    case "animation":
      return <Film className="w-5 h-5" />;
    default:
      return null;
  }
}

export function ArtifactDetailPage() {
  const { type, id } = useParams<{ type: ContentType; id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CommonDetail | null>(null);
  const [structure, setStructure] = useState<
    | NovelVolumeWithChapters[]
    | ComicVolumeWithChapters[]
    | AnimationVolumeWithChapters[]
  >([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloadChapterId, setDownloadChapterId] = useState<string>("");
  const [downloadFormat, setDownloadFormat] = useState<"zip" | "cbz">("zip");
  const [showAnimationDownloadDialog, setShowAnimationDownloadDialog] =
    useState(false);
  const [animationDownloadChapterId, setAnimationDownloadChapterId] =
    useState<string>("");

  const artifactId = Number(id);

  useEffect(() => {
    if (type && artifactId) {
      loadData();
    }
  }, [type, artifactId]);

  useEffect(() => {
    if (!artifactId) return;
    const fetchStatus = async () => {
      const [bookmarkRes, historyRes] = await Promise.all([
        getBookmarkStatus(artifactId),
        getHistory(artifactId),
      ]);
      if (bookmarkRes.code === 0 && bookmarkRes.data) {
        setBookmarked(bookmarkRes.data.bookmarked);
      }
      if (historyRes.code === 0 && historyRes.data) {
        setHistory(historyRes.data);
      }
    };
    fetchStatus();
  }, [artifactId]);

  const loadData = async () => {
    setLoading(true);
    try {
      let detailRes, structureRes;
      switch (type) {
        case "novel":
          [detailRes, structureRes] = await Promise.all([
            getNovel(artifactId),
            getNovelStructure(artifactId),
          ]);
          break;
        case "comic":
          [detailRes, structureRes] = await Promise.all([
            getComic(artifactId),
            getComicStructure(artifactId),
          ]);
          break;
        case "animation":
          [detailRes, structureRes] = await Promise.all([
            getAnimation(artifactId),
            getAnimationStructure(artifactId),
          ]);
          break;
      }
      if (detailRes?.code === 0 && detailRes.data) {
        setDetail(detailRes.data);
      }
      if (structureRes?.code === 0 && structureRes.data) {
        setStructure(structureRes.data);
        // 自动选择第一话（用于下载对话框）
        const volumes = structureRes.data as Array<{
          chapters?: Array<{ id: number }>;
        }>;
        if (
          volumes.length > 0 &&
          volumes[0].chapters &&
          volumes[0].chapters.length > 0
        ) {
          const firstChapterId = String(volumes[0].chapters[0].id);
          if (type === "comic") {
            setDownloadChapterId(firstChapterId);
          } else if (type === "animation") {
            setAnimationDownloadChapterId(firstChapterId);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChapterClick = (volumeId: number, chapterId: number) => {
    navigate(`/read/${type}/${artifactId}/${volumeId}/${chapterId}`);
  };

  const toggleBookmark = async () => {
    if (!artifactId || bookmarking) return;
    setBookmarking(true);
    try {
      if (bookmarked) {
        const res = await removeBookmark(artifactId);
        if (res.code === 0) {
          setBookmarked(false);
        }
      } else {
        const res = await addBookmark(artifactId);
        if (res.code === 0) {
          setBookmarked(true);
        }
      }
    } finally {
      setBookmarking(false);
    }
  };

  const getChapterLabel = (
    volumeIndex: number,
    chapterIndex: number,
  ): string => {
    if (!type) return "";
    if (type === "novel") {
      return t("detail.chapter", {
        num: `${volumeIndex + 1}-${chapterIndex + 1}`,
      });
    }
    return t("detail.episode", { num: chapterIndex + 1 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">{t("common.noData")}</p>
      </div>
    );
  }

  const visibleVolumes = structure.filter(
    (volume) => (volume.chapters?.length ?? 0) > 0,
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto w-full max-w-5xl lg:max-w-6xl flex items-center gap-4 h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/reading")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold truncate flex-1">{detail.title}</h1>
          {getContentTypeIcon(type as ContentType)}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl lg:max-w-6xl px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <div className="shrink-0 mx-auto sm:mx-0">
            <div className="w-40 sm:w-48 aspect-[1/1.414] rounded-lg overflow-hidden border shadow-lg">
              {detail.coverImgUrl ? (
                <img
                  src={detail.coverImgUrl}
                  alt={detail.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  {getContentTypeIcon(type as ContentType)}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">{detail.title}</h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {getContentTypeLabel(t, type as ContentType)}
                </Badge>
                <Badge
                  variant={detail.isCompleted === 1 ? "default" : "outline"}
                >
                  {detail.isCompleted === 1
                    ? t("detail.completed")
                    : t("detail.ongoing")}
                </Badge>
              </div>
            </div>

            {detail.tags && detail.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail.tags.map((tag, index) => (
                  <Badge
                    key={`tag-${tag.id}-${index}`}
                    variant="outline"
                    className="text-xs"
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}

            {detail.author && (
              <div className="text-sm text-muted-foreground">
                {t("detail.author")}: {detail.author}
              </div>
            )}
            {detail.publishTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {t("detail.publishTime")}: {detail.publishTime.split(" ")[0]}
                </span>
              </div>
            )}

            {detail.desc && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {detail.desc}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {structure.length > 0 && type && (
                <>
                  {history && (
                    <Button
                      size="lg"
                      onClick={() =>
                        handleChapterClick(history.volumeId, history.chapterId)
                      }
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {type === "animation"
                        ? t("detail.continueWatching")
                        : t("detail.continueReading")}
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant={history ? "outline" : "default"}
                    onClick={() => {
                      const firstVolume = structure[0];
                      if (firstVolume?.chapters?.[0]) {
                        handleChapterClick(
                          firstVolume.id,
                          firstVolume.chapters[0].id,
                        );
                      }
                    }}
                  >
                    {type === "novel" && <BookOpen className="w-4 h-4 mr-2" />}
                    {type === "comic" && <Image className="w-4 h-4 mr-2" />}
                    {type === "animation" && <Play className="w-4 h-4 mr-2" />}
                    {!history &&
                      type === "animation" &&
                      t("detail.startWatching")}
                    {!history &&
                      type !== "animation" &&
                      t("detail.startReading")}
                    {history && t("detail.startFromBeginning")}
                  </Button>
                </>
              )}
              <Button
                variant={bookmarked ? "default" : "outline"}
                size="lg"
                onClick={toggleBookmark}
                disabled={bookmarking}
              >
                {bookmarking ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : bookmarked ? (
                  <BookmarkCheck className="w-4 h-4 mr-2" />
                ) : (
                  <Bookmark className="w-4 h-4 mr-2" />
                )}
                {bookmarked ? t("bookmark.added") : t("bookmark.add")}
              </Button>
              {type === "novel" && id && (
                <Button variant="outline" size="lg" asChild>
                  <a href={getNovelExportTxtUrl(Number(id))} download>
                    <Download className="w-4 h-4 mr-2" />
                    {t("detail.download")}
                  </a>
                </Button>
              )}
              {type === "comic" && id && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowDownloadDialog(true)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t("detail.download")}
                </Button>
              )}
              {type === "animation" && id && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowAnimationDownloadDialog(true)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t("detail.download")}
                </Button>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          {visibleVolumes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t("common.noData")}
            </p>
          ) : (
            <div className="space-y-4">
              {visibleVolumes.map((volume, volumeIndex) => (
                <div
                  key={volume.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div className="bg-muted/50 px-4 py-3 font-medium">
                    {volume.title ||
                      t("detail.defaultVolume", { num: volumeIndex + 1 })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2">
                    {volume.chapters?.map((chapter, chapterIndex) => (
                      <div
                        key={chapter.id}
                        className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() =>
                          handleChapterClick(volume.id, chapter.id)
                        }
                      >
                        <div className="min-w-0">
                          <span className="text-sm truncate">
                            {chapter.title ||
                              getChapterLabel(volumeIndex, chapterIndex)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("detail.downloadComicTitle")}</DialogTitle>
            <DialogDescription>
              {t("detail.downloadComicDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("detail.selectChapter")}
              </label>
              <Select
                value={downloadChapterId}
                onValueChange={setDownloadChapterId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("detail.selectChapter")} />
                </SelectTrigger>
                <SelectContent>
                  {(structure as ComicVolumeWithChapters[])?.map(
                    (volume, vi) => (
                      <div key={volume.id}>
                        {volume.chapters?.map((chapter, ci) => (
                          <SelectItem
                            key={`${volume.id}-${chapter.id}`}
                            value={String(chapter.id)}
                          >
                            {volume.title || `第${vi + 1}卷`} -{" "}
                            {chapter.title || `第${ci + 1}话`}
                          </SelectItem>
                        ))}
                      </div>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("detail.selectFormat")}
              </label>
              <Select
                value={downloadFormat}
                onValueChange={(v) => setDownloadFormat(v as "zip" | "cbz")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zip">{t("detail.formatZip")}</SelectItem>
                  <SelectItem value="cbz">{t("detail.formatCbz")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDownloadDialog(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button disabled={!downloadChapterId} asChild>
                <a
                  href={getComicExportUrl(
                    Number(id),
                    Number(downloadChapterId),
                    downloadFormat,
                  )}
                  download
                  onClick={() => setShowDownloadDialog(false)}
                >
                  {t("common.confirm")}
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAnimationDownloadDialog}
        onOpenChange={setShowAnimationDownloadDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("detail.downloadAnimationTitle")}</DialogTitle>
            <DialogDescription>
              {t("detail.downloadAnimationDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("detail.selectChapter")}
              </label>
              <Select
                value={animationDownloadChapterId}
                onValueChange={setAnimationDownloadChapterId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("detail.selectChapter")} />
                </SelectTrigger>
                <SelectContent>
                  {(structure as AnimationVolumeWithChapters[])?.map(
                    (volume, vi) => (
                      <div key={volume.id}>
                        {volume.chapters?.map((chapter, ci) => (
                          <SelectItem
                            key={`${volume.id}-${chapter.id}`}
                            value={String(chapter.id)}
                          >
                            {volume.title || `第${vi + 1}季`} -{" "}
                            {chapter.title || `第${ci + 1}话`}
                          </SelectItem>
                        ))}
                      </div>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAnimationDownloadDialog(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button disabled={!animationDownloadChapterId} asChild>
                <a
                  href={getAnimationExportUrl(
                    Number(id),
                    Number(animationDownloadChapterId),
                  )}
                  download
                  onClick={() => setShowAnimationDownloadDialog(false)}
                >
                  {t("common.confirm")}
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
