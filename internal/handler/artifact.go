package handler

import (
	"comicfun/internal/database"
	"comicfun/internal/model"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type ArtifactListRequest struct {
	Keyword       string `form:"keyword"`
	TagIDs        string `form:"tag_ids"`
	ExcludeTagIDs string `form:"exclude_tag_ids"`
	ContentType   int    `form:"content_type"`
	IsComplete    *int   `form:"is_complete"`
	SortOrder     string `form:"sort_order"`
	Page          int    `form:"page"`
	PageSize      int    `form:"page_size"`
}

type ArtifactListItem struct {
	ID          uint   `json:"id"`
	ContentType int    `json:"contentType"`
	Title       string `json:"title"`
	CoverImgURL string `json:"coverImgUrl"`
	IsCompleted int    `json:"isCompleted"`
	PublishTime string `json:"publishTime"`
}

type ArtifactListResponse struct {
	Items    []ArtifactListItem `json:"items"`
	Total    int64              `json:"total"`
	Page     int                `json:"page"`
	PageSize int                `json:"pageSize"`
}

func ListArtifacts(c *gin.Context) {
	var req ArtifactListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		BadRequest(c, "invalid request parameters")
		return
	}

	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")
	userIDUint := userID.(uint)
	isAdminInt := isAdmin.(int)

	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}
	if req.SortOrder == "" {
		req.SortOrder = "desc"
	}

	query := database.DB.Model(&model.Artifact{}).Where("content_type != ?", model.ContentTypeEmpty)

	if isAdminInt != 1 {
		query = query.Where("access_level >= ?", 1).
			Or("access_level = ? AND id IN (SELECT artifact_id FROM user_artifact_acl WHERE user_id = ?)", 0, userIDUint)
	}

	if req.Keyword != "" {
		query = query.Where("title LIKE ?", "%"+req.Keyword+"%")
	}

	if req.ContentType > 0 {
		query = query.Where("content_type = ?", req.ContentType)
	}

	var tagIDs []uint
	if req.TagIDs != "" {
		for _, part := range strings.Split(req.TagIDs, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			if id, err := strconv.ParseUint(part, 10, 64); err == nil && id > 0 {
				tagIDs = append(tagIDs, uint(id))
			}
		}
	}
	if len(tagIDs) > 0 {
		subQuery := database.DB.Table("artifact_tag").
			Select("artifact_id").
			Where("tag_id IN ?", tagIDs)
		query = query.Where("artifact.id IN (?)", subQuery)
	}

	var excludeTagIDs []uint
	if req.ExcludeTagIDs != "" {
		for _, part := range strings.Split(req.ExcludeTagIDs, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			if id, err := strconv.ParseUint(part, 10, 64); err == nil && id > 0 {
				excludeTagIDs = append(excludeTagIDs, uint(id))
			}
		}
	}
	if len(excludeTagIDs) > 0 {
		query = query.Where("artifact.id NOT IN (SELECT artifact_id FROM artifact_tag WHERE tag_id IN ?)", excludeTagIDs)
	}

	if req.IsComplete != nil {
		query = query.Where("is_completed = ?", *req.IsComplete)
	}

	var total int64
	query.Count(&total)

	orderClause := "publish_time DESC"
	if req.SortOrder == "asc" {
		orderClause = "publish_time ASC"
	}

	var artifacts []model.Artifact
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order(orderClause).Offset(offset).Limit(req.PageSize).Find(&artifacts).Error; err != nil {
		InternalError(c, "failed to query artifacts")
		return
	}

	items := make([]ArtifactListItem, len(artifacts))
	for i, a := range artifacts {
		items[i] = ArtifactListItem{
			ID:          a.ID,
			ContentType: a.ContentType,
			Title:       a.Title,
			CoverImgURL: a.CoverImgURL,
			IsCompleted: a.IsCompleted,
			PublishTime: FormatDateTime(a.PublishTime),
		}
	}

	Success(c, ArtifactListResponse{
		Items:    items,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	})
}
