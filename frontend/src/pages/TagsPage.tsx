import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronUp,
  ChevronDown,
  Eye,
  Upload,
  X,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { listTags, createTag, updateTag, deleteTag } from "@/services/tag";
import { uploadTagImage } from "@/services/upload";
import type { TagData } from "@/services/tag";

export function TagsPage() {
  const { t } = useTranslation();
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [editingTag, setEditingTag] = useState<TagData | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    isCatalog: false,
    tagImgUrl: "",
  });

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    setLoading(true);
    const res = await listTags();
    if (res.code === 0 && res.data) {
      setTags(res.data);
    }
    setLoading(false);
  };

  const openCreateDialog = () => {
    setEditingTag(null);
    setForm({
      name: "",
      isCatalog: false,
      tagImgUrl: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (tag: TagData) => {
    setEditingTag(tag);
    setForm({
      name: tag.name,
      isCatalog: tag.isCatalog === 1,
      tagImgUrl: tag.tagImgUrl,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (tag: TagData) => {
    setDeletingTag(tag);
    setDeleteDialogOpen(true);
  };

  const openPreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const res = await uploadTagImage(file);
    setUploading(false);

    if (res.code === 0 && res.data) {
      setForm({ ...form, tagImgUrl: res.data.url });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearImage = () => {
    setForm({ ...form, tagImgUrl: "" });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;

    setSubmitting(true);
    const data: {
      name: string;
      isCatalog: number;
      tagImgUrl: string;
      displayOrder?: number;
    } = {
      name: form.name.trim(),
      isCatalog: form.isCatalog ? 1 : 0,
      tagImgUrl: form.tagImgUrl.trim(),
    };

    if (!editingTag) {
      const maxOrder =
        tags.length > 0 ? Math.max(...tags.map((t) => t.displayOrder)) : 0;
      data.displayOrder = maxOrder + 1;
    }

    let res;
    if (editingTag) {
      res = await updateTag(editingTag.id, data);
    } else {
      res = await createTag(data);
    }

    setSubmitting(false);

    if (res.code === 0) {
      setDialogOpen(false);
      loadTags();
    }
  };

  const handleDelete = async () => {
    if (!deletingTag) return;

    setSubmitting(true);
    const res = await deleteTag(deletingTag.id);
    setSubmitting(false);

    if (res.code === 0) {
      setDeleteDialogOpen(false);
      setDeletingTag(null);
      loadTags();
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const tag1 = tags[index];
    const tag2 = tags[index - 1];

    await Promise.all([
      updateTag(tag1.id, { displayOrder: tag2.displayOrder }),
      updateTag(tag2.id, { displayOrder: tag1.displayOrder }),
    ]);

    loadTags();
  };

  const moveDown = async (index: number) => {
    if (index === tags.length - 1) return;
    const tag1 = tags[index];
    const tag2 = tags[index + 1];

    await Promise.all([
      updateTag(tag1.id, { displayOrder: tag2.displayOrder }),
      updateTag(tag2.id, { displayOrder: tag1.displayOrder }),
    ]);

    loadTags();
  };

  return (
    <Layout>
      <div className="space-y-6 px-4 pb-6 pt-4 md:px-0 md:pb-0 md:pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t("tags.title")}</h1>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t("tags.create")}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {t("common.noData")}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>{t("tags.name")}</TableHead>
                  <TableHead className="w-24 text-center">
                    {t("tags.image")}
                  </TableHead>
                  <TableHead className="w-28 text-center">
                    {t("tags.isCatalog")}
                  </TableHead>
                  <TableHead className="w-28 text-center">
                    {t("tags.order")}
                  </TableHead>
                  <TableHead className="w-28 text-center">
                    {t("common.edit")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag, index) => (
                  <TableRow key={tag.id}>
                    <TableCell>{tag.id}</TableCell>
                    <TableCell className="font-medium">{tag.name}</TableCell>
                    <TableCell className="text-center">
                      {tag.tagImgUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPreview(tag.tagImgUrl)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {tag.isCatalog === 1 ? t("common.yes") : t("common.no")}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                          onClick={() => moveUp(index)}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === tags.length - 1}
                          onClick={() => moveDown(index)}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(tag)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(tag)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingTag ? t("tags.edit") : t("tags.create")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("tags.name")}</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("tags.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("tags.image")}</Label>
              <div className="flex items-center gap-4">
                {form.tagImgUrl ? (
                  <div className="relative">
                    <img
                      src={form.tagImgUrl}
                      alt="preview"
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5"
                      onClick={clearImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {t("tags.uploadImage")}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isCatalog"
                checked={form.isCatalog}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isCatalog: checked })
                }
              />
              <Label htmlFor="isCatalog">{t("tags.isCatalog")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.name.trim()}
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
            <AlertDialogTitle>{t("tags.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("tags.deleteConfirm", { name: deletingTag?.name })}
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

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("tags.imagePreview")}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            <img
              src={previewUrl}
              alt="preview"
              className="max-w-full max-h-80 object-contain rounded"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
