import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Film,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccessDialog } from "@/components/ui/access-dialog";
import {
  listAnimations,
  createAnimation,
  deleteAnimation,
} from "@/services/animation";
import { listTags } from "@/services/tag";
import type {
  AnimationListItem,
  ListAnimationsParams,
} from "@/services/animation";
import type { TagData } from "@/services/tag";
import { useAuthStore } from "@/stores";

export function AnimationListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [animations, setAnimations] = useState<AnimationListItem[]>([]);
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [selectedAnimationForAccess, setSelectedAnimationForAccess] =
    useState<AnimationListItem | null>(null);
  const [deletingAnimation, setDeletingAnimation] =
    useState<AnimationListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [form, setForm] = useState({
    title: "",
    author: "",
    desc: "",
  });

  const loadTags = useCallback(async () => {
    const response = await listTags();
    if (response.code === 0 && response.data) {
      setTags(response.data);
    }
  }, []);

  const loadAnimations = useCallback(async () => {
    setLoading(true);
    const params: ListAnimationsParams = {
      page,
      pageSize,
    };
    if (searchKeyword) {
      params.keyword = searchKeyword;
    }
    if (selectedTags.length > 0) {
      params.tagIds = selectedTags;
    }
    if (selectedStatus === "completed") {
      params.isComplete = 1;
    } else if (selectedStatus === "ongoing") {
      params.isComplete = 0;
    }
    const res = await listAnimations(params);
    if (res.code === 0 && res.data) {
      setAnimations(res.data.items);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [page, pageSize, searchKeyword, selectedTags, selectedStatus]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    loadAnimations();
  }, [loadAnimations]);

  const openCreateDialog = () => {
    setForm({ title: "", author: "", desc: "" });
    setDialogOpen(true);
  };

  const openDeleteDialog = (animation: AnimationListItem) => {
    setDeletingAnimation(animation);
    setDeleteDialogOpen(true);
  };

  const openAccessDialog = (animation: AnimationListItem) => {
    setSelectedAnimationForAccess(animation);
    setAccessDialogOpen(true);
  };

  const handleSearch = () => {
    setSearchKeyword(keyword);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleTagChange = (tagId: number, checked: boolean) => {
    setSelectedTags((prev) =>
      checked ? [...prev, tagId] : prev.filter((id) => id !== tagId),
    );
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(parseInt(value, 10));
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  const handleCreate = async () => {
    if (!form.title.trim()) return;

    setSubmitting(true);
    const res = await createAnimation({
      title: form.title.trim(),
      author: form.author.trim() || undefined,
      desc: form.desc.trim() || undefined,
    });
    setSubmitting(false);

    if (res.code === 0 && res.data) {
      setDialogOpen(false);
      navigate(`/animation/${res.data.id}`);
    }
  };

  const handleDelete = async () => {
    if (!deletingAnimation) return;

    setSubmitting(true);
    const res = await deleteAnimation(deletingAnimation.id);
    setSubmitting(false);

    if (res.code === 0) {
      setDeleteDialogOpen(false);
      setDeletingAnimation(null);
      loadAnimations();
    }
  };

  const getAccessLevelBadge = (level: number) => {
    switch (level) {
      case 1:
        return <Badge variant="secondary">{t("animation.accessFamily")}</Badge>;
      default:
        return <Badge variant="outline">{t("animation.accessPrivate")}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 px-4 pb-6 pt-4 md:px-0 md:pb-0 md:pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t("animation.title")}</h1>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t("animation.create")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 p-3 border rounded-lg bg-muted/30">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("animation.searchPlaceholder")}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            {t("common.search")}
          </Button>

          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">
              {t("animation.tags")}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-40 justify-start h-auto min-h-9"
                >
                  {selectedTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedTags.map((tagId) => {
                        const tag = tags.find((t) => t.id === tagId);
                        return tag ? (
                          <Badge key={tagId} variant="secondary">
                            {tag.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("common.all")}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  <div
                    className="flex items-center space-x-2 rounded p-2 hover:bg-accent cursor-pointer"
                    onClick={() => {
                      setSelectedTags([]);
                      setPage(1);
                    }}
                  >
                    <Checkbox checked={selectedTags.length === 0} />
                    <Label className="cursor-pointer">{t("common.all")}</Label>
                  </div>
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center space-x-2 rounded p-2 hover:bg-accent cursor-pointer"
                      onClick={() =>
                        handleTagChange(tag.id, !selectedTags.includes(tag.id))
                      }
                    >
                      <Checkbox checked={selectedTags.includes(tag.id)} />
                      <Label className="cursor-pointer">{tag.name}</Label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">
              {t("animation.status")}
            </label>
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="completed">
                  {t("animation.completed")}
                </SelectItem>
                <SelectItem value="ongoing">
                  {t("animation.ongoing")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : animations.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {t("common.noData")}
          </div>
        ) : (
          <>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>{t("animation.animationTitle")}</TableHead>
                    <TableHead className="w-28 text-center">
                      {t("animation.seasons")}
                    </TableHead>
                    <TableHead className="w-28 text-center">
                      {t("animation.episodes")}
                    </TableHead>
                    <TableHead className="w-28 text-center">
                      {t("animation.status")}
                    </TableHead>
                    <TableHead className="w-28 text-center">
                      {t("animation.access")}
                    </TableHead>
                    <TableHead className="w-28 text-center">
                      {t("common.operation")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {animations.map((animation) => (
                    <TableRow key={animation.id}>
                      <TableCell>{animation.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Film className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{animation.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {animation.volumeCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {animation.chapterCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {animation.isCompleted === 1 ? (
                          <Badge variant="default">
                            {t("animation.completed")}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            {t("animation.ongoing")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getAccessLevelBadge(animation.accessLevel)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/animation/${animation.id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {user?.isAdmin === 1 && animation.accessLevel === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAccessDialog(animation)}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(animation)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {total > pageSize && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t("management.pageSize")}
                  </span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {page} / {totalPages} ({total})
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("animation.create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("animation.animationTitle")}</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("animation.titlePlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting || !form.title.trim()}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("animation.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("animation.deleteConfirm", { name: deletingAnimation?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AccessDialog
        open={accessDialogOpen}
        onOpenChange={setAccessDialogOpen}
        artifactId={selectedAnimationForAccess?.id?.toString() || ""}
        title={t("acl.manageAccess", {
          name: selectedAnimationForAccess?.title,
        })}
      />
    </Layout>
  );
}
