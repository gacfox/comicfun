import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import Player from "xgplayer";
import "xgplayer/dist/index.min.css";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Layout } from "@/components/layout";
import {
  getAnimation,
  getAnimationStructure,
  getAnimationChapter,
} from "@/services/animation";
import { updateHistory, getHistory } from "@/services/history";
import type {
  AnimationVolumeWithChapters,
  AnimationChapterData,
} from "@/services/animation";

export function AnimationPlayerPage() {
  const { animationId, volumeId, chapterId } = useParams<{
    animationId: string;
    volumeId: string;
    chapterId: string;
  }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const playerRef = useRef<Player | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const historyPositionRef = useRef<number>(0);

  const [loading, setLoading] = useState(true);
  const [animation, setAnimation] = useState<{ title: string } | null>(null);
  const [structure, setStructure] = useState<AnimationVolumeWithChapters[]>([]);
  const [chapter, setChapter] = useState<AnimationChapterData | null>(null);

  const currentAnimationId = Number(animationId);
  const currentVolumeId = Number(volumeId);
  const currentChapterId = Number(chapterId);

  useEffect(() => {
    if (currentAnimationId) {
      loadAnimation();
    }
  }, [currentAnimationId]);

  useEffect(() => {
    if (currentChapterId) {
      loadChapter();
    }
  }, [currentChapterId]);

  const loadAnimation = async () => {
    const [animationRes, structureRes] = await Promise.all([
      getAnimation(currentAnimationId),
      getAnimationStructure(currentAnimationId),
    ]);

    if (animationRes.code === 0 && animationRes.data) {
      setAnimation(animationRes.data);
    }

    if (structureRes.code === 0 && structureRes.data) {
      setStructure(structureRes.data);
    }
  };

  const loadChapter = async () => {
    setLoading(true);
    const res = await getAnimationChapter(currentChapterId);
    if (res.code === 0 && res.data) {
      setChapter(res.data);
    }
    setLoading(false);
  };

  const handleChapterSelect = (volumeId: number, chapterId: number) => {
    navigate(`/read/animation/${currentAnimationId}/${volumeId}/${chapterId}`);
  };

  useEffect(() => {
    if (!chapter?.videoUrl || !playerContainerRef.current) return;

    let destroyed = false;

    const initPlayer = async () => {
      setLoading(true);

      let startPosition = 0;
      const historyRes = await getHistory(currentAnimationId);
      if (
        !destroyed &&
        historyRes.code === 0 &&
        historyRes.data &&
        historyRes.data.chapterId === currentChapterId
      ) {
        startPosition = historyRes.data.position || 0;
      }

      if (destroyed || !playerContainerRef.current) return;

      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      const playerLang = i18n.language.startsWith("zh") ? "zh-cn" : "en";

      playerRef.current = new Player({
        el: playerContainerRef.current,
        url: chapter.videoUrl,
        fluid: true,
        playsinline: true,
        autoplay: false,
        lang: playerLang,
        playbackRate: [0.75, 1, 1.25, 1.5, 2],
        startTime: startPosition > 0 ? startPosition : undefined,
      });

      historyPositionRef.current = startPosition;

      playerRef.current.on("ready", () => {
        setLoading(false);
      });

      playerRef.current.on("timeupdate", () => {
        if (playerRef.current) {
          historyPositionRef.current = playerRef.current.currentTime;
        }
      });

      const saveHistory = () => {
        if (playerRef.current && historyPositionRef.current > 0) {
          if (
            Number.isFinite(currentAnimationId) &&
            Number.isFinite(currentVolumeId) &&
            Number.isFinite(currentChapterId)
          ) {
            updateHistory({
              artifactId: currentAnimationId,
              volumeId: currentVolumeId,
              chapterId: currentChapterId,
              position: Math.floor(historyPositionRef.current),
            });
          }
        }
      };

      playerRef.current.on("pause", saveHistory);
      playerRef.current.on("ended", saveHistory);
    };

    initPlayer();

    return () => {
      destroyed = true;
      if (playerRef.current && historyPositionRef.current > 0) {
        if (
          Number.isFinite(currentAnimationId) &&
          Number.isFinite(currentVolumeId) &&
          Number.isFinite(currentChapterId)
        ) {
          updateHistory({
            artifactId: currentAnimationId,
            volumeId: currentVolumeId,
            chapterId: currentChapterId,
            position: Math.floor(historyPositionRef.current),
          });
        }
      }
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [
    chapter?.videoUrl,
    currentAnimationId,
    currentVolumeId,
    currentChapterId,
    i18n.language,
  ]);

  const visibleVolumes = useMemo(
    () => structure.filter((volume) => (volume.chapters?.length ?? 0) > 0),
    [structure],
  );

  if (loading && !chapter) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!chapter?.videoUrl) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="mb-4 text-muted-foreground">{t("common.noData")}</p>
          <Button
            variant="outline"
            onClick={() => navigate(`/detail/animation/${animationId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")}
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 px-4 pb-6 pt-4 md:px-0 md:pb-0 md:pt-0">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/detail/animation/${currentAnimationId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{animation?.title ?? chapter.title}</CardTitle>
            <CardDescription>{chapter.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-lg border bg-card">
              <div className="aspect-video w-full">
                <div ref={playerContainerRef} className="h-full w-full" />
              </div>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {visibleVolumes.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-muted-foreground text-center py-6">
                {t("common.noData")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleVolumes.map((volume, volumeIndex) => (
              <Card key={volume.id} className="overflow-hidden py-0">
                <CardHeader className="bg-muted/50 py-3">
                  <CardTitle className="text-base">
                    {volume.title ||
                      t("detail.defaultVolume", { num: volumeIndex + 1 })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 pb-4">
                  {volume.chapters?.map((ch, chapterIndex) => {
                    const isActive = ch.id === currentChapterId;
                    return (
                      <div
                        key={ch.id}
                        className={`flex items-center justify-between rounded-md px-3 py-2 cursor-pointer transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/30"
                        }`}
                        onClick={() => handleChapterSelect(volume.id, ch.id)}
                      >
                        <div className="min-w-0">
                          <span className="text-sm truncate">
                            {ch.title ||
                              t("detail.episode", { num: chapterIndex + 1 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
