package handler

import (
	"comicfun/internal/database"
	"comicfun/internal/model"
	"errors"
	"net/http"
	"strconv"
	"time"

	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
)

type BookmarkRequest struct {
	ArtifactID uint `json:"artifactId"`
}

type BookmarkStatusResponse struct {
	Bookmarked bool `json:"bookmarked"`
}

type BookmarkListItem struct {
	BookmarkID  uint      `json:"bookmarkId"`
	CreateTime  time.Time `json:"createTime"`
	ArtifactID  uint      `json:"artifactId"`
	ContentType int       `json:"contentType"`
	Title       string    `json:"title"`
	CoverImgURL string    `json:"coverImgUrl"`
	IsCompleted int       `json:"isCompleted"`
	PublishTime string    `json:"publishTime"`
}

type BookmarkListResponse struct {
	Items []BookmarkListItem `json:"items"`
}

func getUserID(c *gin.Context) (uint, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}
	id, ok := userID.(uint)
	return id, ok
}

func ListBookmarks(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		Unauthorized(c, "unauthorized")
		return
	}

	var items []BookmarkListItem
	if err := database.DB.Table("bookmark").
		Select("bookmark.id as bookmark_id, bookmark.create_time, artifact.id as artifact_id, artifact.content_type, artifact.title, artifact.cover_img_url, artifact.is_completed, artifact.publish_time").
		Joins("left join artifact on artifact.id = bookmark.artifact_id").
		Where("bookmark.user_id = ?", userID).
		Order("bookmark.create_time desc").
		Scan(&items).Error; err != nil {
		InternalError(c, "failed to query bookmarks")
		return
	}

	Success(c, BookmarkListResponse{Items: items})
}

func GetBookmarkStatus(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		Unauthorized(c, "unauthorized")
		return
	}

	artifactID, err := strconv.ParseUint(c.Param("artifactId"), 10, 64)
	if err != nil || artifactID == 0 {
		BadRequest(c, "invalid artifact id")
		return
	}

	var count int64
	if err := database.DB.Model(&model.Bookmark{}).
		Where("user_id = ? AND artifact_id = ?", userID, uint(artifactID)).
		Count(&count).Error; err != nil {
		InternalError(c, "failed to query bookmark status")
		return
	}

	Success(c, BookmarkStatusResponse{Bookmarked: count > 0})
}

func AddBookmark(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		Unauthorized(c, "unauthorized")
		return
	}

	var req BookmarkRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ArtifactID == 0 {
		BadRequest(c, "invalid request parameters")
		return
	}

	var artifact model.Artifact
	if err := database.DB.First(&artifact, req.ArtifactID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			NotFound(c, "artifact not found")
			return
		}
		InternalError(c, "failed to query artifact")
		return
	}

	var existing model.Bookmark
	err := database.DB.Where("user_id = ? AND artifact_id = ?", userID, req.ArtifactID).First(&existing).Error
	if err == nil {
		Success(c, nil)
		return
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		InternalError(c, "failed to query bookmark")
		return
	}

	bookmark := model.Bookmark{
		UserID:     userID,
		ArtifactID: req.ArtifactID,
		CreateTime: time.Now(),
	}
	if err := database.DB.Create(&bookmark).Error; err != nil {
		InternalError(c, "failed to create bookmark")
		return
	}

	Success(c, nil)
}

func RemoveBookmark(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		Unauthorized(c, "unauthorized")
		return
	}

	artifactID, err := strconv.ParseUint(c.Param("artifactId"), 10, 64)
	if err != nil || artifactID == 0 {
		BadRequest(c, "invalid artifact id")
		return
	}

	if err := database.DB.Where("user_id = ? AND artifact_id = ?", userID, uint(artifactID)).
		Delete(&model.Bookmark{}).Error; err != nil {
		InternalError(c, "failed to delete bookmark")
		return
	}

	c.JSON(http.StatusOK, Response{Code: CodeSuccess, Message: "success"})
}
