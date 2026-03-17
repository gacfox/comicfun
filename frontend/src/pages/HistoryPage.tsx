import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, BookOpen, Image, Film, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Layout } from "@/components/layout";
import { listHistory, deleteHistory, clearHistory } from "@/services/history";
import type { HistoryItem } from "@/services/history";

function getContentTypeIcon(type: number) {
  switch (type) {
    case 1:
      return <BookOpen className="w-4 h-4" />;
    case 2:
      return <Image className="w-4 h-4" />;
    case 3:
      return <Film className="w-4 h-4" />;
    default:
      return null;
  }
}

function getContentTypeRoute(type: number): string {
  switch (type) {
    case 1:
      return "novel";
    case 2:
      return "comic";
    case 3:
      return "animation";
    default:
      return "";
  }
}

function getContentTypeLabel(t: (key: string) => string, type: number): string {
  switch (type) {
    case 1:
      return t("reading.contentType.novel");
    case 2:
      return t("reading.contentType.comic");
    case 3:
      return t("reading.contentType.animation");
    default:
      return "";
  }
}

function formatUpdateTime(updateTime: string): string {
  const date = new Date(updateTime);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) {
    return "刚刚";
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString();
  }
}

export function HistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const res = await listHistory();
    if (res.code === 0 && res.data) {
      setItems(res.data.items);
    }
    setLoading(false);
  };

  const handleContinue = (item: HistoryItem) => {
    const type = getContentTypeRoute(item.contentType);
    navigate(
      `/read/${type}/${item.artifactId}/${item.volumeId}/${item.chapterId}`,
    );
  };

  const handleDelete = async (artifactId: number) => {
    setDeleting(true);
    const res = await deleteHistory(artifactId);
    if (res.code === 0) {
      setItems(items.filter((i) => i.artifactId !== artifactId));
    }
    setDeleting(false);
    setShowDeleteDialog(null);
  };

  const handleClear = async () => {
    setClearing(true);
    const res = await clearHistory();
    if (res.code === 0) {
      setItems([]);
    }
    setClearing(false);
    setShowClearDialog(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 px-4 pb-6 pt-4 md:px-0 md:pb-0 md:pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("history.title")}</h1>
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("history.clear")}
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t("history.empty")}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-15 text-center">类型</TableHead>
                  <TableHead>作品名称</TableHead>
                  <TableHead className="w-30">阅读进度</TableHead>
                  <TableHead className="w-35">最后阅读时间</TableHead>
                  <TableHead className="w-40 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {getContentTypeIcon(item.contentType)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.coverImgUrl ? (
                          <img
                            src={item.coverImgUrl}
                            alt={item.title}
                            className="w-10 h-14 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                            {getContentTypeIcon(item.contentType)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {getContentTypeLabel(t, item.contentType)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground line-clamp-2">
                        {item.chapterTitle || `第${item.chapterId}话`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatUpdateTime(item.updateTime)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" onClick={() => handleContinue(item)}>
                          <Play className="w-4 h-4 mr-1" />
                          {item.contentType === 3
                            ? t("detail.continueWatching")
                            : t("detail.continueReading")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowDeleteDialog(item.artifactId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("history.clear")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("history.clearConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} disabled={clearing}>
              {clearing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showDeleteDialog !== null}
        onOpenChange={(open) => !open && setShowDeleteDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("history.removeConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
