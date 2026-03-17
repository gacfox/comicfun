import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Image,
  Film,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { Layout } from "@/components/layout";
import { listArtifacts } from "@/services/artifact";
import { listTags } from "@/services/tag";
import type { ArtifactListItem } from "@/services/artifact";
import type { TagData } from "@/services/tag";

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

function getContentTypeLabel(t: (key: string) => string, type: number) {
  switch (type) {
    case CONTENT_TYPE_NOVEL:
      return t("reading.contentType.novel");
    case CONTENT_TYPE_COMIC:
      return t("reading.contentType.comic");
    case CONTENT_TYPE_ANIMATION:
      return t("reading.contentType.animation");
    default:
      return "";
  }
}

function ArtifactCard({
  artifact,
  onClick,
}: {
  artifact: ArtifactListItem;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border bg-card overflow-hidden transition-all hover:shadow-lg"
    >
      <div className="aspect-[1/1.414] bg-muted relative overflow-hidden">
        {artifact.coverImgUrl ? (
          <img
            src={artifact.coverImgUrl}
            alt={artifact.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getContentTypeIcon(artifact.contentType)}
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge variant="secondary" className="text-xs">
            {getContentTypeLabel(t, artifact.contentType)}
          </Badge>
          {artifact.isCompleted === 1 && (
            <Badge variant="secondary" className="text-xs">
              {t("reading.filter.completed")}
            </Badge>
          )}
          {artifact.isCompleted === 0 && (
            <Badge variant="secondary" className="text-xs">
              {t("reading.filter.ongoing")}
            </Badge>
          )}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2">{artifact.title}</h3>
      </div>
    </div>
  );
}

export function ReadingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tagParam = searchParams.get("tag");
  const initialIncludeTags = tagParam
    ? tagParam
        .split(",")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id))
    : [];

  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [includeTags, setIncludeTags] = useState<number[]>(initialIncludeTags);
  const [excludeTags, setExcludeTags] = useState<number[]>([]);
  const [selectedContentType, setSelectedContentType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [filterExpanded, setFilterExpanded] = useState(
    initialIncludeTags.length > 0,
  );

  const [artifacts, setArtifacts] = useState<ArtifactListItem[]>([]);
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const hasMore = artifacts.length < total;

  const fetchTags = useCallback(async () => {
    const response = await listTags();
    if (response.code === 0 && response.data) {
      setTags(response.data);
    }
  }, []);

  const fetchArtifacts = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const params: {
          keyword?: string;
          tagIds?: number[];
          excludeTagIds?: number[];
          contentType?: number;
          isComplete?: number;
          sortOrder: "desc" | "asc";
          page: number;
          pageSize: number;
        } = {
          sortOrder,
          page: pageNum,
          pageSize,
        };

        if (searchKeyword) {
          params.keyword = searchKeyword;
        }
        if (includeTags.length > 0) {
          params.tagIds = includeTags;
        }
        if (excludeTags.length > 0) {
          params.excludeTagIds = excludeTags;
        }
        if (selectedContentType !== "all") {
          params.contentType = parseInt(selectedContentType, 10);
        }
        if (selectedStatus === "completed") {
          params.isComplete = 1;
        } else if (selectedStatus === "ongoing") {
          params.isComplete = 0;
        }

        const response = await listArtifacts(params);
        if (response.code === 0 && response.data) {
          if (append) {
            setArtifacts((prev) => [...prev, ...response.data!.items]);
          } else {
            setArtifacts(response.data.items);
          }
          setTotal(response.data.total);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      searchKeyword,
      includeTags,
      excludeTags,
      selectedContentType,
      selectedStatus,
      sortOrder,
    ],
  );

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArtifacts(nextPage, true);
  }, [loadingMore, hasMore, page, fetchArtifacts]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    setPage(1);
    fetchArtifacts(1, false);
  }, [
    searchKeyword,
    includeTags,
    excludeTags,
    selectedContentType,
    selectedStatus,
    sortOrder,
    fetchArtifacts,
  ]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loadingMore, loadMore]);

  const handleSearch = () => {
    setSearchKeyword(keyword);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleCardClick = (artifact: ArtifactListItem) => {
    const type =
      artifact.contentType === CONTENT_TYPE_NOVEL
        ? "novel"
        : artifact.contentType === CONTENT_TYPE_COMIC
          ? "comic"
          : "animation";
    navigate(`/detail/${type}/${artifact.id}`);
  };

  const handleFilterChange = () => {
    setPage(1);
  };

  const handleReset = () => {
    setKeyword("");
    setSearchKeyword("");
    setIncludeTags([]);
    setExcludeTags([]);
    setSelectedContentType("all");
    setSelectedStatus("all");
    setSortOrder("desc");
    setPage(1);
    navigate("/reading", { replace: true });
  };

  return (
    <Layout>
      <div className="space-y-6 px-4 pb-6 pt-4 md:px-0 md:pb-0 md:pt-0">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              onClick={() => setFilterExpanded(!filterExpanded)}
            >
              <Filter className="w-4 h-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">
                {t("reading.advancedFilter")}
              </span>
              {filterExpanded ? (
                <ChevronUp className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              )}
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("reading.searchPlaceholder")}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">{t("common.search")}</span>
            </Button>
          </div>

          {filterExpanded && (
            <div className="flex flex-wrap items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground whitespace-nowrap">
                  {t("reading.filter.tagInclude")}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-48 justify-start h-auto min-h-9"
                    >
                      {includeTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {includeTags.map((tagId) => {
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
                    <div className="space-y-1">
                      <div
                        className="flex items-center space-x-2 rounded p-2 hover:bg-accent cursor-pointer"
                        onClick={() => {
                          setIncludeTags([]);
                          handleFilterChange();
                        }}
                      >
                        <Checkbox checked={includeTags.length === 0} />
                        <Label className="cursor-pointer">
                          {t("common.all")}
                        </Label>
                      </div>
                      {tags.map((tag) => {
                        const checked = includeTags.includes(tag.id);
                        const excluded = excludeTags.includes(tag.id);
                        return (
                          <div
                            key={tag.id}
                            className={`flex items-center space-x-2 rounded p-2 hover:bg-accent cursor-pointer ${excluded ? "opacity-50" : ""}`}
                            onClick={() => {
                              if (excluded) return;
                              setIncludeTags((prev) =>
                                prev.includes(tag.id)
                                  ? prev.filter((id) => id !== tag.id)
                                  : [...prev, tag.id],
                              );
                              handleFilterChange();
                            }}
                          >
                            <Checkbox checked={checked} disabled={excluded} />
                            <Label
                              className={`cursor-pointer ${excluded ? "opacity-50" : ""}`}
                            >
                              {tag.name}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground whitespace-nowrap">
                  {t("reading.filter.tagExclude")}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-48 justify-start h-auto min-h-9"
                    >
                      {excludeTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {excludeTags.map((tagId) => {
                            const tag = tags.find((t) => t.id === tagId);
                            return tag ? (
                              <Badge key={tagId} variant="destructive">
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
                    <div className="space-y-1">
                      <div
                        className="flex items-center space-x-2 rounded p-2 hover:bg-accent cursor-pointer"
                        onClick={() => {
                          setExcludeTags([]);
                          handleFilterChange();
                        }}
                      >
                        <Checkbox checked={excludeTags.length === 0} />
                        <Label className="cursor-pointer">
                          {t("common.all")}
                        </Label>
                      </div>
                      {tags.map((tag) => {
                        const checked = excludeTags.includes(tag.id);
                        const included = includeTags.includes(tag.id);
                        return (
                          <div
                            key={tag.id}
                            className={`flex items-center space-x-2 rounded p-2 hover:bg-accent cursor-pointer ${included ? "opacity-50" : ""}`}
                            onClick={() => {
                              if (included) return;
                              setExcludeTags((prev) =>
                                prev.includes(tag.id)
                                  ? prev.filter((id) => id !== tag.id)
                                  : [...prev, tag.id],
                              );
                              handleFilterChange();
                            }}
                          >
                            <Checkbox checked={checked} disabled={included} />
                            <Label
                              className={`cursor-pointer ${included ? "opacity-50" : ""}`}
                            >
                              {tag.name}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground whitespace-nowrap">
                  {t("reading.filter.status")}
                </label>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) => {
                    setSelectedStatus(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="completed">
                      {t("reading.filter.completed")}
                    </SelectItem>
                    <SelectItem value="ongoing">
                      {t("reading.filter.ongoing")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground whitespace-nowrap">
                  {t("reading.filter.contentType")}
                </label>
                <Select
                  value={selectedContentType}
                  onValueChange={(value) => {
                    setSelectedContentType(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value={CONTENT_TYPE_NOVEL.toString()}>
                      {t("reading.contentType.novel")}
                    </SelectItem>
                    <SelectItem value={CONTENT_TYPE_COMIC.toString()}>
                      {t("reading.contentType.comic")}
                    </SelectItem>
                    <SelectItem value={CONTENT_TYPE_ANIMATION.toString()}>
                      {t("reading.contentType.animation")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground whitespace-nowrap">
                  {t("reading.filter.sortOrder")}
                </label>
                <Select
                  value={sortOrder}
                  onValueChange={(value: "asc" | "desc") => {
                    setSortOrder(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">
                      {t("reading.filter.publishTimeDesc")}
                    </SelectItem>
                    <SelectItem value="asc">
                      {t("reading.filter.publishTimeAsc")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {t("reading.filter.reset")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        ) : artifacts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t("common.noData")}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {artifacts.map((artifact) => (
                <ArtifactCard
                  key={artifact.id}
                  artifact={artifact}
                  onClick={() => handleCardClick(artifact)}
                />
              ))}
            </div>

            {artifacts.length > 0 && (
              <div
                ref={loadMoreRef}
                className="flex flex-col items-center gap-2 py-4"
              >
                {loadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">{t("common.loading")}</span>
                  </div>
                )}
                {!hasMore && total > pageSize && (
                  <p className="text-sm text-muted-foreground">
                    {t("reading.noMore")}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
