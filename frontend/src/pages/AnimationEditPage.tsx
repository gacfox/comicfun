import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Plus,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Save,
  Upload,
  X,
  Play,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getAnimation,
  updateAnimation,
  getAnimationStructure,
  createAnimationVolume,
  updateAnimationVolume,
  deleteAnimationVolume,
  createAnimationChapter,
  updateAnimationChapter,
  deleteAnimationChapter,
  getAnimationChapter,
} from "@/services/animation";
import { uploadCover, uploadVideo } from "@/services/upload";
import { listTags } from "@/services/tag";
import type {
  AnimationDetailResponse,
  AnimationVolumeData,
  AnimationChapterData,
  AnimationVolumeWithChapters,
} from "@/services/animation";
import type { TagData } from "@/services/tag";

type EditMode = "meta" | "volume" | "chapter";

export function AnimationEditPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [animation, setAnimation] = useState<AnimationDetailResponse | null>(
    null,
  );
  const [structure, setStructure] = useState<AnimationVolumeWithChapters[]>([]);
  const [editMode, setEditMode] = useState<EditMode>("meta");
  const [selectedVolume, setSelectedVolume] =
    useState<AnimationVolumeData | null>(null);
  const [selectedChapter, setSelectedChapter] =
    useState<AnimationChapterData | null>(null);
  const [expandedVolumes, setExpandedVolumes] = useState<Set<number>>(
    new Set(),
  );

  const [volumeDialogOpen, setVolumeDialogOpen] = useState(false);
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"volume" | "chapter">("volume");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewType, setPreviewType] = useState<"image" | "video">("image");

  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [availableTags, setAvailableTags] = useState<TagData[]>([]);

  const [metaForm, setMetaForm] = useState({
    title: "",
    desc: "",
    author: "",
    coverImgUrl: "",
    isCompleted: 0,
    accessLevel: 0,
    publishTime: "",
    tagIds: [] as number[],
  });

  const [volumeForm, setVolumeForm] = useState({
    title: "",
    desc: "",
  });

  const [chapterForm, setChapterForm] = useState({
    title: "",
    videoUrl: "",
    publishTime: "",
  });

  const [newVolumeForm, setNewVolumeForm] = useState("");

  const [newChapterForm, setNewChapterForm] = useState("");

  const animationId = Number(id);

  useEffect(() => {
    if (animationId) {
      loadData();
    }
  }, [animationId]);

  const loadData = async () => {
    setLoading(true);
    const [animationRes, structureRes, tagsRes] = await Promise.all([
      getAnimation(animationId),
      getAnimationStructure(animationId),
      listTags(),
    ]);

    if (animationRes.code === 0 && animationRes.data) {
      setAnimation(animationRes.data);
      setMetaForm({
        title: animationRes.data.title,
        desc: animationRes.data.desc,
        author: animationRes.data.author || "",
        coverImgUrl: animationRes.data.coverImgUrl,
        isCompleted: animationRes.data.isCompleted,
        accessLevel: animationRes.data.accessLevel,
        publishTime: animationRes.data.publishTime,
        tagIds: animationRes.data.tags?.map((t) => t.id) || [],
      });
    }

    if (structureRes.code === 0 && structureRes.data) {
      setStructure(structureRes.data);
    }

    if (tagsRes.code === 0 && tagsRes.data) {
      setAvailableTags(tagsRes.data);
    }

    setLoading(false);
  };

  const loadStructure = async () => {
    const res = await getAnimationStructure(animationId);
    if (res.code === 0 && res.data) {
      setStructure(res.data);
    }
  };

  const toggleVolume = (volumeId: number) => {
    const newExpanded = new Set(expandedVolumes);
    if (newExpanded.has(volumeId)) {
      newExpanded.delete(volumeId);
    } else {
      newExpanded.add(volumeId);
    }
    setExpandedVolumes(newExpanded);
  };

  const selectMeta = () => {
    setEditMode("meta");
    setSelectedVolume(null);
    setSelectedChapter(null);
  };

  const selectVolume = (volume: AnimationVolumeData) => {
    setEditMode("volume");
    setSelectedVolume(volume);
    setSelectedChapter(null);
    setVolumeForm({
      title: volume.title,
      desc: volume.desc,
    });
  };

  const selectChapter = async (
    chapter: AnimationChapterData,
    volume: AnimationVolumeData,
  ) => {
    setEditMode("chapter");
    setSelectedVolume(volume);
    setSelectedChapter(chapter);

    const res = await getAnimationChapter(chapter.id);
    if (res.code === 0 && res.data) {
      setChapterForm({
        title: res.data.title,
        videoUrl: res.data.videoUrl,
        publishTime: res.data.publishTime,
      });
    }
  };

  const openPreview = (url: string, type: "image" | "video") => {
    setPreviewUrl(url);
    setPreviewType(type);
    setPreviewOpen(true);
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const res = await uploadCover(file);
    setUploading(false);

    if (res.code === 0 && res.data) {
      const newCoverUrl = res.data.url;
      setMetaForm({ ...metaForm, coverImgUrl: newCoverUrl });

      setSaving(true);
      const saveRes = await updateAnimation(animationId, {
        title: metaForm.title.trim(),
        desc: metaForm.desc.trim() || undefined,
        author: metaForm.author.trim() || undefined,
        coverImgUrl: newCoverUrl,
        isCompleted: metaForm.isCompleted,
        accessLevel: metaForm.accessLevel,
        publishTime: metaForm.publishTime || undefined,
        tagIds: metaForm.tagIds,
      });
      setSaving(false);

      if (saveRes.code === 0) {
        if (animation) {
          setAnimation({
            ...animation,
            title: metaForm.title,
            desc: metaForm.desc,
            author: metaForm.author,
            coverImgUrl: newCoverUrl,
            isCompleted: metaForm.isCompleted,
            accessLevel: metaForm.accessLevel,
            publishTime: metaForm.publishTime,
          });
        }
        toast.success(t("common.saveSuccess"));
      }
    }

    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  };

  const clearCover = () => {
    setMetaForm({ ...metaForm, coverImgUrl: "" });
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedChapter || !selectedVolume) {
      toast.error(t("animation.selectEpisodeFirst"));
      return;
    }

    setUploadingVideo(true);
    const res = await uploadVideo(
      file,
      animationId,
      selectedVolume.id,
      selectedChapter.id,
    );
    setUploadingVideo(false);

    if (res.code === 0 && res.data) {
      setChapterForm({ ...chapterForm, videoUrl: res.data.url });
    }

    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  const clearVideo = () => {
    setChapterForm({ ...chapterForm, videoUrl: "" });
  };

  const handleSaveMeta = async () => {
    setSaving(true);
    const res = await updateAnimation(animationId, {
      title: metaForm.title.trim(),
      desc: metaForm.desc.trim() || undefined,
      author: metaForm.author.trim() || undefined,
      coverImgUrl: metaForm.coverImgUrl.trim() || undefined,
      isCompleted: metaForm.isCompleted,
      accessLevel: metaForm.accessLevel,
      publishTime: metaForm.publishTime || undefined,
      tagIds: metaForm.tagIds,
    });
    setSaving(false);

    if (res.code === 0) {
      if (animation) {
        setAnimation({
          ...animation,
          title: metaForm.title,
          desc: metaForm.desc,
          author: metaForm.author,
          coverImgUrl: metaForm.coverImgUrl,
          isCompleted: metaForm.isCompleted,
          accessLevel: metaForm.accessLevel,
          publishTime: metaForm.publishTime,
        });
      }
      toast.success(t("common.saveSuccess"));
    }
  };

  const handleSaveVolume = async () => {
    if (!selectedVolume || !volumeForm.title.trim()) return;

    setSaving(true);
    const res = await updateAnimationVolume(selectedVolume.id, {
      title: volumeForm.title.trim(),
      desc: volumeForm.desc.trim() || undefined,
    });
    setSaving(false);

    if (res.code === 0) {
      loadStructure();
      toast.success(t("common.saveSuccess"));
    }
  };

  const handleSaveChapter = async () => {
    if (!selectedChapter || !chapterForm.title.trim()) return;

    setSaving(true);
    const res = await updateAnimationChapter(selectedChapter.id, {
      title: chapterForm.title.trim(),
      videoUrl: chapterForm.videoUrl.trim() || undefined,
      publishTime: chapterForm.publishTime || undefined,
    });
    setSaving(false);

    if (res.code === 0) {
      loadStructure();
      toast.success(t("common.saveSuccess"));
    }
  };

  const openCreateVolumeDialog = () => {
    setNewVolumeForm("");
    setVolumeDialogOpen(true);
  };

  const handleCreateVolume = async () => {
    if (!newVolumeForm.trim()) return;

    setSaving(true);
    const res = await createAnimationVolume(animationId, {
      title: newVolumeForm.trim(),
    });
    setSaving(false);

    if (res.code === 0 && res.data) {
      setVolumeDialogOpen(false);
      await loadStructure();
      selectVolume(res.data);
      setNewVolumeForm("");
    }
  };

  const openCreateChapterDialog = (volumeId: number) => {
    const volume = structure.find((v) => v.id === volumeId);
    if (volume) {
      setSelectedVolume(volume);
    }
    setNewChapterForm("");
    setChapterDialogOpen(true);
  };

  const handleCreateChapter = async () => {
    if (!selectedVolume || !newChapterForm.trim()) return;

    setSaving(true);
    const res = await createAnimationChapter(selectedVolume.id, {
      title: newChapterForm.trim(),
    });
    setSaving(false);

    if (res.code === 0 && res.data) {
      setChapterDialogOpen(false);
      await loadStructure();
      const newExpanded = new Set(expandedVolumes);
      newExpanded.add(selectedVolume.id);
      setExpandedVolumes(newExpanded);
      selectChapter(res.data, selectedVolume);
      setNewChapterForm("");
    }
  };

  const openDeleteDialog = (
    type: "volume" | "chapter",
    id: number,
    name: string,
  ) => {
    setDeleteType(type);
    setDeleteTarget({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    let res;
    if (deleteType === "volume") {
      res = await deleteAnimationVolume(deleteTarget.id);
    } else {
      res = await deleteAnimationChapter(deleteTarget.id);
    }
    setSaving(false);

    if (res.code === 0) {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      if (deleteType === "volume") {
        setSelectedVolume(null);
      } else {
        setSelectedChapter(null);
      }
      setEditMode("meta");
      loadStructure();
    }
  };

  const renderSidebar = () => (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-3 border-b">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={selectMeta}
        >
          <FileText className="h-4 w-4 mr-2" />
          {t("common.workMetadata")}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex items-center justify-between px-2 py-1 text-sm font-medium text-muted-foreground">
          <span>{t("animation.seasons")}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={openCreateVolumeDialog}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {structure.map((volume) => (
          <div key={volume.id} className="mt-1">
            <div
              className={`flex items-center justify-between rounded-md px-2 py-1.5 cursor-pointer hover:bg-accent ${
                selectedVolume?.id === volume.id && editMode === "volume"
                  ? "bg-accent"
                  : ""
              }`}
            >
              <div
                className="flex items-center gap-1 flex-1 min-w-0"
                onClick={() => selectVolume(volume)}
              >
                <button
                  className="p-0.5 hover:bg-accent-foreground/10 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVolume(volume.id);
                  }}
                >
                  {expandedVolumes.has(volume.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate text-sm">{volume.title}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => openCreateChapterDialog(volume.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("animation.addEpisode")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() =>
                      openDeleteDialog("volume", volume.id, volume.title)
                    }
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {expandedVolumes.has(volume.id) &&
              (volume.chapters?.length ?? 0) > 0 && (
                <div className="ml-6 pl-2 border-l">
                  {volume.chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className={`flex items-center justify-between rounded-md px-2 py-1 cursor-pointer hover:bg-accent ${
                        selectedChapter?.id === chapter.id ? "bg-accent" : ""
                      }`}
                      onClick={() => selectChapter(chapter, volume)}
                    >
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate text-sm">
                          {chapter.title}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog(
                            "chapter",
                            chapter.id,
                            chapter.title,
                          );
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderMetaEditor = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("animation.metadata")}</h2>
        <Button onClick={handleSaveMeta} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t("common.save")}
        </Button>
      </div>

      <div className="grid gap-4 w-full">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("animation.animationTitle")}</Label>
            <Input
              id="title"
              value={metaForm.title}
              onChange={(e) =>
                setMetaForm({ ...metaForm, title: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="author">{t("animation.author")}</Label>
            <Input
              id="author"
              value={metaForm.author}
              onChange={(e) =>
                setMetaForm({ ...metaForm, author: e.target.value })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="desc">{t("animation.description")}</Label>
          <Textarea
            id="desc"
            value={metaForm.desc}
            onChange={(e) => setMetaForm({ ...metaForm, desc: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("animation.coverImage")}</Label>
          <div className="flex items-center gap-4">
            {metaForm.coverImgUrl ? (
              <div className="relative">
                <img
                  src={metaForm.coverImgUrl}
                  alt="cover"
                  className="w-20 h-28 object-cover rounded border cursor-pointer"
                  onClick={() => openPreview(metaForm.coverImgUrl, "image")}
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5"
                  onClick={clearCover}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {t("animation.uploadCover")}
              </Button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverSelect}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t("animation.status")}</Label>
            <Select
              value={metaForm.isCompleted.toString()}
              onValueChange={(v) =>
                setMetaForm({ ...metaForm, isCompleted: Number(v) })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t("animation.ongoing")}</SelectItem>
                <SelectItem value="1">{t("animation.completed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("animation.access")}</Label>
            <Select
              value={metaForm.accessLevel.toString()}
              onValueChange={(v) =>
                setMetaForm({ ...metaForm, accessLevel: Number(v) })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">
                  {t("animation.accessPrivate")}
                </SelectItem>
                <SelectItem value="1">{t("animation.accessFamily")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("animation.publishTime")}</Label>
            <DatePicker
              value={metaForm.publishTime}
              onChange={(value) =>
                setMetaForm({ ...metaForm, publishTime: value })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("animation.tags")}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start h-auto min-h-10"
              >
                {metaForm.tagIds.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {metaForm.tagIds.map((tagId) => {
                      const tag = availableTags.find((t) => t.id === tagId);
                      return tag ? (
                        <Badge key={tagId} variant="secondary" className="mr-1">
                          {tag.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    {t("animation.selectTags")}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-2">
                {availableTags.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    {t("common.noData")}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {availableTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center space-x-2 p-2 rounded hover:bg-accent cursor-pointer"
                        onClick={() => {
                          const newTagIds = metaForm.tagIds.includes(tag.id)
                            ? metaForm.tagIds.filter((id) => id !== tag.id)
                            : [...metaForm.tagIds, tag.id];
                          setMetaForm({ ...metaForm, tagIds: newTagIds });
                        }}
                      >
                        <Checkbox
                          checked={metaForm.tagIds.includes(tag.id)}
                          onCheckedChange={() => {}}
                        />
                        <Label className="cursor-pointer">{tag.name}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );

  const renderVolumeEditor = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {t("animation.editSeason")} - {selectedVolume?.title}
        </h2>
        <Button
          onClick={handleSaveVolume}
          disabled={saving || !volumeForm.title.trim()}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t("common.save")}
        </Button>
      </div>

      <div className="grid gap-4 w-full">
        <div className="space-y-2">
          <Label htmlFor="volumeTitle">{t("animation.seasonTitle")}</Label>
          <Input
            id="volumeTitle"
            value={volumeForm.title}
            onChange={(e) =>
              setVolumeForm({ ...volumeForm, title: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="volumeDesc">{t("animation.description")}</Label>
          <Textarea
            id="volumeDesc"
            value={volumeForm.desc}
            onChange={(e) =>
              setVolumeForm({ ...volumeForm, desc: e.target.value })
            }
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  const renderChapterEditor = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {t("animation.editEpisode")} - {selectedChapter?.title}
        </h2>
        <Button
          onClick={handleSaveChapter}
          disabled={saving || !chapterForm.title.trim()}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t("common.save")}
        </Button>
      </div>

      <div className="grid gap-4 w-full">
        <div className="space-y-2">
          <Label htmlFor="chapterTitle">{t("animation.episodeTitle")}</Label>
          <Input
            id="chapterTitle"
            value={chapterForm.title}
            onChange={(e) =>
              setChapterForm({ ...chapterForm, title: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>{t("animation.publishTime")}</Label>
          <DatePicker
            value={chapterForm.publishTime}
            onChange={(value) =>
              setChapterForm({ ...chapterForm, publishTime: value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>{t("animation.video")}</Label>
          <div className="flex items-center gap-4">
            {chapterForm.videoUrl ? (
              <div className="relative">
                <div
                  className="w-32 h-20 bg-muted rounded border flex items-center justify-center cursor-pointer"
                  onClick={() => openPreview(chapterForm.videoUrl, "video")}
                >
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5"
                  onClick={clearVideo}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploadingVideo}
              >
                {uploadingVideo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {t("animation.uploadVideo")}
              </Button>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center gap-4 h-14 px-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/animation")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.back")}
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold">{animation?.title}</h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {renderSidebar()}

        <main className="flex-1 overflow-y-auto">
          {editMode === "meta" && renderMetaEditor()}
          {editMode === "volume" && renderVolumeEditor()}
          {editMode === "chapter" && renderChapterEditor()}
        </main>
      </div>

      <Dialog open={volumeDialogOpen} onOpenChange={setVolumeDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("animation.addSeason")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newVolumeTitle">
                {t("animation.seasonTitle")}
              </Label>
              <Input
                id="newVolumeTitle"
                value={newVolumeForm}
                onChange={(e) => setNewVolumeForm(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVolumeDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateVolume}
              disabled={saving || !newVolumeForm.trim()}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("animation.addEpisode")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newChapterTitle">
                {t("animation.episodeTitle")}
              </Label>
              <Input
                id="newChapterTitle"
                value={newChapterForm}
                onChange={(e) => setNewChapterForm(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChapterDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateChapter}
              disabled={saving || !newChapterForm.trim()}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteType === "volume"
                ? t("animation.deleteSeasonTitle")
                : t("animation.deleteEpisodeTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "volume"
                ? t("animation.deleteSeasonConfirm", {
                    name: deleteTarget?.name,
                  })
                : t("animation.deleteEpisodeConfirm", {
                    name: deleteTarget?.name,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("animation.preview")}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {previewType === "image" ? (
              <img
                src={previewUrl}
                alt="preview"
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            ) : (
              <video
                src={previewUrl}
                controls
                className="max-w-full max-h-[70vh] rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
