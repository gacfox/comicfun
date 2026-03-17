import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookText, Image, Film, Users, Loader2, Tag } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores";
import { getStatistics } from "@/services/system";
import { listTags } from "@/services/tag";
import type { StatisticsData } from "@/services/types";
import type { TagData } from "@/services/tag";

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [catalogTags, setCatalogTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const fetchStats = async () => {
      const res = await getStatistics();
      if (res.code === 0 && res.data) {
        setStats(res.data);
      }
      setLoading(false);
    };

    const fetchCatalogTags = async () => {
      const res = await listTags();
      if (res.code === 0 && res.data) {
        const tags = res.data
          .filter((tag) => tag.isCatalog === 1)
          .sort((a, b) => a.displayOrder - b.displayOrder);
        setCatalogTags(tags);
      }
      setTagsLoading(false);
    };

    fetchStats();
    fetchCatalogTags();
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const statCards = [
    {
      key: "novel",
      label: t("home.novelCount"),
      value: stats?.novelCount ?? 0,
      icon: BookText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      key: "comic",
      label: t("home.comicCount"),
      value: stats?.comicCount ?? 0,
      icon: Image,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      key: "animation",
      label: t("home.animationCount"),
      value: stats?.animationCount ?? 0,
      icon: Film,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      key: "user",
      label: t("home.userCount"),
      value: stats?.userCount ?? 0,
      icon: Users,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {t("home.welcome")}, {user?.displayUsername || user?.username}!
          </h1>
          <p className="text-muted-foreground">{t("home.subtitle")}</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("home.statistics")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.key}
                      className="flex items-center gap-3 p-4 rounded-lg border bg-card"
                    >
                      <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-sm text-muted-foreground">
                          {stat.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {catalogTags.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t("home.categories")}</CardTitle>
            </CardHeader>
            <CardContent>
              {tagsLoading ? (
                <div className="flex items-center justify-center h-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {catalogTags.map((tag) => (
                    <div
                      key={tag.id}
                      onClick={() => navigate(`/reading?tag=${tag.id}`)}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                    >
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
                        {tag.tagImgUrl ? (
                          <img
                            src={tag.tagImgUrl}
                            alt={tag.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Tag className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium truncate">
                        {tag.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
