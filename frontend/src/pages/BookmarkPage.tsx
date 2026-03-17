import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, Image, Film } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { listBookmarks } from "@/services/bookmark";
import type { BookmarkItem } from "@/services/bookmark";

const CONTENT_TYPE_NOVEL = 1;
const CONTENT_TYPE_COMIC = 2;
const CONTENT_TYPE_ANIMATION = 3;

function getContentTypeIcon(type: number) {
  switch (type) {
    case CONTENT_TYPE_NOVEL:
      return <BookOpen className="w-3 h-3" />;
    case CONTENT_TYPE_COMIC:
      return <Image className="w-3 h-3" />;
    case CONTENT_TYPE_ANIMATION:
      return <Film className="w-3 h-3" />;
    default:
      return null;
  }
}

function getContentTypePath(type: number) {
  switch (type) {
    case CONTENT_TYPE_NOVEL:
      return "novel";
    case CONTENT_TYPE_COMIC:
      return "comic";
    case CONTENT_TYPE_ANIMATION:
      return "animation";
    default:
      return "novel";
  }
}

function BookmarkCard({
  item,
  onClick,
}: {
  item: BookmarkItem;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border bg-card overflow-hidden transition-all hover:shadow-lg"
    >
      <div className="aspect-[1/1.414] bg-muted relative overflow-hidden">
        {item.coverImgUrl ? (
          <img
            src={item.coverImgUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getContentTypeIcon(item.contentType)}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2">{item.title}</h3>
      </div>
    </div>
  );
}

export function BookmarkPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BookmarkItem[]>([]);

  useEffect(() => {
    const fetchBookmarks = async () => {
      setLoading(true);
      const res = await listBookmarks();
      if (res.code === 0) {
        setItems(res.data?.items ?? []);
      }
      setLoading(false);
    };
    fetchBookmarks();
  }, []);

  return (
    <Layout>
      <div className="space-y-6 px-4 pb-6 pt-4 md:px-0 md:pb-0 md:pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t("bookmark.title")}</h1>
          <Button variant="outline" onClick={() => navigate("/reading")}>
            {t("nav.reading")}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t("common.noData")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
              <BookmarkCard
                key={item.bookmarkId}
                item={item}
                onClick={() =>
                  navigate(
                    `/detail/${getContentTypePath(item.contentType)}/${item.artifactId}`,
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
