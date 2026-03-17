package handler

import (
	"archive/zip"
	"bytes"
	"comicfun/internal/config"
	"comicfun/internal/database"
	"comicfun/internal/model"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type ComicListItem struct {
	ID           uint   `json:"id"`
	Title        string `json:"title"`
	Desc         string `json:"desc"`
	Author       string `json:"author"`
	CoverImgURL  string `json:"coverImgUrl"`
	IsCompleted  int    `json:"isCompleted"`
	AccessLevel  int    `json:"accessLevel"`
	PublishTime  string `json:"publishTime"`
	VolumeCount  int64  `json:"volumeCount"`
	ChapterCount int64  `json:"chapterCount"`
}

type ListComicsRequest struct {
	Keyword    string `form:"keyword"`
	TagIDs     string `form:"tag_ids"`
	IsComplete *int   `form:"is_complete"`
	Page       int    `form:"page"`
	PageSize   int    `form:"page_size"`
}

type ListComicsResponse struct {
	Items    []ComicListItem `json:"items"`
	Total    int64           `json:"total"`
	Page     int             `json:"page"`
	PageSize int             `json:"pageSize"`
}

type CreateComicRequest struct {
	Title       string `json:"title" binding:"required"`
	Desc        string `json:"desc"`
	Author      string `json:"author"`
	CoverImgURL string `json:"coverImgUrl"`
	IsCompleted int    `json:"isCompleted"`
	AccessLevel int    `json:"accessLevel"`
	PublishTime string `json:"publishTime"`
	TagIDs      []uint `json:"tagIds"`
}

type UpdateComicRequest struct {
	Title       string `json:"title"`
	Desc        string `json:"desc"`
	Author      string `json:"author"`
	CoverImgURL string `json:"coverImgUrl"`
	IsCompleted *int   `json:"isCompleted"`
	AccessLevel *int   `json:"accessLevel"`
	PublishTime string `json:"publishTime"`
	TagIDs      []uint `json:"tagIds"`
}

type ComicVolumeData struct {
	ID           uint   `json:"id"`
	Title        string `json:"title"`
	Desc         string `json:"desc"`
	DisplayOrder int    `json:"displayOrder"`
}

type ComicChapterData struct {
	ID           uint   `json:"id"`
	Title        string `json:"title"`
	SplitType    int    `json:"splitType"`
	ColorType    int    `json:"colorType"`
	DisplayOrder int    `json:"displayOrder"`
	PublishTime  string `json:"publishTime"`
}

type ComicPageData struct {
	ID           uint   `json:"id"`
	ImageURL     string `json:"imageUrl"`
	DisplayOrder int    `json:"displayOrder"`
}

type ComicDetailResponse struct {
	ID          uint              `json:"id"`
	Title       string            `json:"title"`
	Desc        string            `json:"desc"`
	Author      string            `json:"author"`
	CoverImgURL string            `json:"coverImgUrl"`
	IsCompleted int               `json:"isCompleted"`
	AccessLevel int               `json:"accessLevel"`
	PublishTime string            `json:"publishTime"`
	Volumes     []ComicVolumeData `json:"volumes"`
	Tags        []TagData         `json:"tags"`
}

type CreateComicVolumeRequest struct {
	Title        string `json:"title" binding:"required"`
	Desc         string `json:"desc"`
	DisplayOrder int    `json:"displayOrder"`
}

type UpdateComicVolumeRequest struct {
	Title        string `json:"title"`
	Desc         string `json:"desc"`
	DisplayOrder *int   `json:"displayOrder"`
}

type CreateComicChapterRequest struct {
	Title        string `json:"title" binding:"required"`
	SplitType    int    `json:"splitType"`
	ColorType    int    `json:"colorType"`
	DisplayOrder int    `json:"displayOrder"`
	PublishTime  string `json:"publishTime"`
}

type UpdateComicChapterRequest struct {
	Title        string `json:"title"`
	SplitType    *int   `json:"splitType"`
	ColorType    *int   `json:"colorType"`
	DisplayOrder *int   `json:"displayOrder"`
	PublishTime  string `json:"publishTime"`
}

type CreateComicPageRequest struct {
	ImageURL     string `json:"imageUrl" binding:"required"`
	DisplayOrder int    `json:"displayOrder"`
}

type UpdateComicPageRequest struct {
	ImageURL     string `json:"imageUrl"`
	DisplayOrder *int   `json:"displayOrder"`
}

type ComicVolumeWithChapters struct {
	ID           uint                    `json:"id"`
	Title        string                  `json:"title"`
	Desc         string                  `json:"desc"`
	DisplayOrder int                     `json:"displayOrder"`
	Chapters     []ComicChapterWithPages `json:"chapters"`
}

type ComicChapterWithPages struct {
	ID           uint            `json:"id"`
	Title        string          `json:"title"`
	SplitType    int             `json:"splitType"`
	ColorType    int             `json:"colorType"`
	DisplayOrder int             `json:"displayOrder"`
	PublishTime  string          `json:"publishTime"`
	Pages        []ComicPageData `json:"pages"`
}

func ListComics(c *gin.Context) {
	var req ListComicsRequest
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
		req.PageSize = 50
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}

	query := database.DB.Model(&model.Artifact{}).Where("content_type = ?", model.ContentTypeComic)

	if isAdminInt != 1 {
		query = query.Where("access_level >= ?", 1).
			Or("access_level = ? AND id IN (SELECT artifact_id FROM user_artifact_acl WHERE user_id = ?)", 0, userIDUint)
	}

	if req.Keyword != "" {
		query = query.Where("title LIKE ?", "%"+req.Keyword+"%")
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

	if req.IsComplete != nil {
		query = query.Where("is_completed = ?", *req.IsComplete)
	}

	var total int64
	query.Count(&total)

	var artifacts []model.Artifact
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("artifact.id DESC").Offset(offset).Limit(req.PageSize).Find(&artifacts).Error; err != nil {
		InternalError(c, "failed to query comics")
		return
	}

	items := make([]ComicListItem, len(artifacts))
	for i, a := range artifacts {
		var volumeCount, chapterCount int64
		database.DB.Model(&model.ComicVolume{}).Where("artifact_id = ?", a.ID).Count(&volumeCount)
		database.DB.Table("comic_chapter").
			Joins("JOIN comic_volume ON comic_chapter.comic_volume_id = comic_volume.id").
			Where("comic_volume.artifact_id = ?", a.ID).
			Count(&chapterCount)

		items[i] = ComicListItem{
			ID:           a.ID,
			Title:        a.Title,
			Desc:         a.Desc,
			Author:       a.Author,
			CoverImgURL:  a.CoverImgURL,
			IsCompleted:  a.IsCompleted,
			AccessLevel:  a.AccessLevel,
			PublishTime:  a.PublishTime,
			VolumeCount:  volumeCount,
			ChapterCount: chapterCount,
		}
	}

	Success(c, ListComicsResponse{Items: items, Total: total, Page: req.Page, PageSize: req.PageSize})
}

func CreateComic(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req CreateComicRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	now := time.Now().Format("2006-01-02 15:04:05")
	artifact := model.Artifact{
		ContentType: model.ContentTypeComic,
		Title:       req.Title,
		Desc:        req.Desc,
		Author:      req.Author,
		CoverImgURL: req.CoverImgURL,
		IsCompleted: req.IsCompleted,
		UserID:      userID,
		AccessLevel: req.AccessLevel,
		PublishTime: req.PublishTime,
		CreateTime:  now,
		UpdateTime:  now,
	}

	if err := database.DB.Create(&artifact).Error; err != nil {
		InternalError(c, "failed to create comic")
		return
	}

	if len(req.TagIDs) > 0 {
		var tags []model.Tag
		if err := database.DB.Where("id IN ?", req.TagIDs).Find(&tags).Error; err == nil {
			database.DB.Model(&artifact).Association("Tags").Replace(tags)
		}
	}

	Success(c, gin.H{"id": artifact.ID})
}

func GetComic(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "comic id is required")
		return
	}

	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")
	userIDUint := userID.(uint)
	isAdminInt := isAdmin.(int)

	var artifact model.Artifact
	if err := database.DB.Preload("Tags").First(&artifact, id).Error; err != nil {
		NotFound(c, "comic not found")
		return
	}

	if artifact.ContentType != model.ContentTypeComic {
		BadRequest(c, "not a comic")
		return
	}

	if isAdminInt != 1 {
		hasAccess := false

		if artifact.AccessLevel >= 1 {
			hasAccess = true
		} else {
			var aclCount int64
			database.DB.Model(&model.UserArtifactACL{}).
				Where("artifact_id = ? AND user_id = ?", artifact.ID, userIDUint).
				Count(&aclCount)
			if aclCount > 0 {
				hasAccess = true
			}
		}

		if !hasAccess {
			Forbidden(c, "access denied")
			return
		}
	}

	var volumes []model.ComicVolume
	if err := database.DB.Where("artifact_id = ?", artifact.ID).
		Order("display_order ASC, id ASC").Find(&volumes).Error; err != nil {
		InternalError(c, "failed to query volumes")
		return
	}

	volumeData := make([]ComicVolumeData, len(volumes))
	for i, v := range volumes {
		volumeData[i] = ComicVolumeData{
			ID:           v.ID,
			Title:        v.Title,
			Desc:         v.Desc,
			DisplayOrder: v.DisplayOrder,
		}
	}

	tagData := make([]TagData, len(artifact.Tags))
	for i, t := range artifact.Tags {
		tagData[i] = TagData{
			ID:           t.ID,
			Name:         t.Name,
			IsCatalog:    t.IsCatalog,
			TagImgURL:    t.TagImgURL,
			DisplayOrder: t.DisplayOrder,
		}
	}

	Success(c, ComicDetailResponse{
		ID:          artifact.ID,
		Title:       artifact.Title,
		Desc:        artifact.Desc,
		Author:      artifact.Author,
		CoverImgURL: artifact.CoverImgURL,
		IsCompleted: artifact.IsCompleted,
		AccessLevel: artifact.AccessLevel,
		PublishTime: artifact.PublishTime,
		Volumes:     volumeData,
		Tags:        tagData,
	})
}

func UpdateComic(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "comic id is required")
		return
	}

	var artifact model.Artifact
	if err := database.DB.First(&artifact, id).Error; err != nil {
		NotFound(c, "comic not found")
		return
	}

	if artifact.ContentType != model.ContentTypeComic {
		BadRequest(c, "not a comic")
		return
	}

	var req UpdateComicRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	if req.Title != "" {
		artifact.Title = req.Title
	}
	if req.Desc != "" {
		artifact.Desc = req.Desc
	}
	if req.Author != "" {
		artifact.Author = req.Author
	}
	if req.CoverImgURL != "" {
		artifact.CoverImgURL = req.CoverImgURL
	}
	if req.IsCompleted != nil {
		artifact.IsCompleted = *req.IsCompleted
	}
	if req.AccessLevel != nil {
		artifact.AccessLevel = *req.AccessLevel
	}
	if req.PublishTime != "" {
		artifact.PublishTime = req.PublishTime
	}
	artifact.UpdateTime = time.Now().Format("2006-01-02 15:04:05")

	if err := database.DB.Save(&artifact).Error; err != nil {
		InternalError(c, "failed to update comic")
		return
	}

	if req.TagIDs != nil {
		if len(req.TagIDs) > 0 {
			var tags []model.Tag
			database.DB.Where("id IN ?", req.TagIDs).Find(&tags)
			database.DB.Model(&artifact).Association("Tags").Replace(tags)
		} else {
			database.DB.Model(&artifact).Association("Tags").Clear()
		}
	}

	Success(c, nil)
}

func DeleteComic(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "comic id is required")
		return
	}

	var artifact model.Artifact
	if err := database.DB.First(&artifact, id).Error; err != nil {
		NotFound(c, "comic not found")
		return
	}

	if artifact.ContentType != model.ContentTypeComic {
		BadRequest(c, "not a comic")
		return
	}

	var volumeIDs []uint
	database.DB.Model(&model.ComicVolume{}).Where("artifact_id = ?", artifact.ID).Pluck("id", &volumeIDs)

	if len(volumeIDs) > 0 {
		var chapterIDs []uint
		database.DB.Model(&model.ComicChapter{}).Where("comic_volume_id IN ?", volumeIDs).Pluck("id", &chapterIDs)

		if len(chapterIDs) > 0 {
			var pages []model.ComicPage
			database.DB.Where("comic_chapter_id IN ?", chapterIDs).Find(&pages)
			for _, page := range pages {
				deleteComicPageImage(page.ImageURL)
			}
			database.DB.Where("comic_chapter_id IN ?", chapterIDs).Delete(&model.ComicPage{})
		}
		database.DB.Where("comic_volume_id IN ?", volumeIDs).Delete(&model.ComicChapter{})
		database.DB.Where("artifact_id = ?", artifact.ID).Delete(&model.ComicVolume{})
	}

	database.DB.Where("artifact_id = ?", artifact.ID).Delete(&model.ArtifactTag{})

	if err := database.DB.Delete(&artifact).Error; err != nil {
		InternalError(c, "failed to delete comic")
		return
	}

	Success(c, nil)
}

func ListComicVolumes(c *gin.Context) {
	artifactID := c.Param("id")
	if artifactID == "" {
		BadRequest(c, "comic id is required")
		return
	}

	var volumes []model.ComicVolume
	if err := database.DB.Where("artifact_id = ?", artifactID).
		Order("display_order ASC, id ASC").Find(&volumes).Error; err != nil {
		InternalError(c, "failed to query volumes")
		return
	}

	items := make([]ComicVolumeData, len(volumes))
	for i, v := range volumes {
		items[i] = ComicVolumeData{
			ID:           v.ID,
			Title:        v.Title,
			Desc:         v.Desc,
			DisplayOrder: v.DisplayOrder,
		}
	}

	Success(c, items)
}

func CreateComicVolume(c *gin.Context) {
	artifactID := c.Param("id")
	if artifactID == "" {
		BadRequest(c, "comic id is required")
		return
	}

	var req CreateComicVolumeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	var maxOrder int
	database.DB.Model(&model.ComicVolume{}).Where("artifact_id = ?", artifactID).
		Select("COALESCE(MAX(display_order), 0)").Scan(&maxOrder)

	volume := model.ComicVolume{
		Title:        req.Title,
		Desc:         req.Desc,
		DisplayOrder: maxOrder + 1,
		ArtifactID:   parseUint(artifactID),
	}

	if err := database.DB.Create(&volume).Error; err != nil {
		InternalError(c, "failed to create volume")
		return
	}

	Success(c, ComicVolumeData{
		ID:           volume.ID,
		Title:        volume.Title,
		Desc:         volume.Desc,
		DisplayOrder: volume.DisplayOrder,
	})
}

func UpdateComicVolume(c *gin.Context) {
	id := c.Param("volumeId")
	if id == "" {
		BadRequest(c, "volume id is required")
		return
	}

	var volume model.ComicVolume
	if err := database.DB.First(&volume, id).Error; err != nil {
		NotFound(c, "volume not found")
		return
	}

	var req UpdateComicVolumeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	if req.Title != "" {
		volume.Title = req.Title
	}
	if req.Desc != "" {
		volume.Desc = req.Desc
	}
	if req.DisplayOrder != nil {
		volume.DisplayOrder = *req.DisplayOrder
	}

	if err := database.DB.Save(&volume).Error; err != nil {
		InternalError(c, "failed to update volume")
		return
	}

	Success(c, nil)
}

func DeleteComicVolume(c *gin.Context) {
	id := c.Param("volumeId")
	if id == "" {
		BadRequest(c, "volume id is required")
		return
	}

	var volume model.ComicVolume
	if err := database.DB.First(&volume, id).Error; err != nil {
		NotFound(c, "volume not found")
		return
	}

	var chapterIDs []uint
	database.DB.Model(&model.ComicChapter{}).Where("comic_volume_id = ?", volume.ID).Pluck("id", &chapterIDs)

	if len(chapterIDs) > 0 {
		var pages []model.ComicPage
		database.DB.Where("comic_chapter_id IN ?", chapterIDs).Find(&pages)
		for _, page := range pages {
			deleteComicPageImage(page.ImageURL)
		}
		database.DB.Where("comic_chapter_id IN ?", chapterIDs).Delete(&model.ComicPage{})
	}
	database.DB.Where("comic_volume_id = ?", volume.ID).Delete(&model.ComicChapter{})

	if err := database.DB.Delete(&volume).Error; err != nil {
		InternalError(c, "failed to delete volume")
		return
	}

	Success(c, nil)
}

func ListComicChapters(c *gin.Context) {
	volumeID := c.Param("volumeId")
	if volumeID == "" {
		BadRequest(c, "volume id is required")
		return
	}

	var chapters []model.ComicChapter
	if err := database.DB.Where("comic_volume_id = ?", volumeID).
		Order("display_order ASC, id ASC").Find(&chapters).Error; err != nil {
		InternalError(c, "failed to query chapters")
		return
	}

	items := make([]ComicChapterData, len(chapters))
	for i, ch := range chapters {
		items[i] = ComicChapterData{
			ID:           ch.ID,
			Title:        ch.Title,
			SplitType:    ch.SplitType,
			ColorType:    ch.ColorType,
			DisplayOrder: ch.DisplayOrder,
			PublishTime:  ch.PublishTime,
		}
	}

	Success(c, items)
}

func GetComicChapter(c *gin.Context) {
	id := c.Param("chapterId")
	if id == "" {
		BadRequest(c, "chapter id is required")
		return
	}

	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")
	userIDUint := userID.(uint)
	isAdminInt := isAdmin.(int)

	var chapter model.ComicChapter
	if err := database.DB.First(&chapter, id).Error; err != nil {
		NotFound(c, "chapter not found")
		return
	}

	var volume model.ComicVolume
	if err := database.DB.First(&volume, chapter.ComicVolumeID).Error; err != nil {
		NotFound(c, "volume not found")
		return
	}

	var artifact model.Artifact
	if err := database.DB.First(&artifact, volume.ArtifactID).Error; err != nil {
		NotFound(c, "comic not found")
		return
	}

	if isAdminInt != 1 {
		hasAccess := false

		if artifact.AccessLevel >= 1 {
			hasAccess = true
		} else {
			var aclCount int64
			database.DB.Model(&model.UserArtifactACL{}).
				Where("artifact_id = ? AND user_id = ?", artifact.ID, userIDUint).
				Count(&aclCount)
			if aclCount > 0 {
				hasAccess = true
			}
		}

		if !hasAccess {
			Forbidden(c, "access denied")
			return
		}
	}

	Success(c, ComicChapterData{
		ID:           chapter.ID,
		Title:        chapter.Title,
		SplitType:    chapter.SplitType,
		ColorType:    chapter.ColorType,
		DisplayOrder: chapter.DisplayOrder,
		PublishTime:  chapter.PublishTime,
	})
}

func CreateComicChapter(c *gin.Context) {
	volumeID := c.Param("volumeId")
	if volumeID == "" {
		BadRequest(c, "volume id is required")
		return
	}

	var req CreateComicChapterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	var maxOrder int
	database.DB.Model(&model.ComicChapter{}).Where("comic_volume_id = ?", volumeID).
		Select("COALESCE(MAX(display_order), 0)").Scan(&maxOrder)

	chapter := model.ComicChapter{
		Title:         req.Title,
		SplitType:     req.SplitType,
		ColorType:     req.ColorType,
		DisplayOrder:  maxOrder + 1,
		ComicVolumeID: parseUint(volumeID),
		PublishTime:   req.PublishTime,
	}

	if err := database.DB.Create(&chapter).Error; err != nil {
		InternalError(c, "failed to create chapter")
		return
	}

	Success(c, ComicChapterData{
		ID:           chapter.ID,
		Title:        chapter.Title,
		SplitType:    chapter.SplitType,
		ColorType:    chapter.ColorType,
		DisplayOrder: chapter.DisplayOrder,
		PublishTime:  chapter.PublishTime,
	})
}

func UpdateComicChapter(c *gin.Context) {
	id := c.Param("chapterId")
	if id == "" {
		BadRequest(c, "chapter id is required")
		return
	}

	var chapter model.ComicChapter
	if err := database.DB.First(&chapter, id).Error; err != nil {
		NotFound(c, "chapter not found")
		return
	}

	var req UpdateComicChapterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	if req.Title != "" {
		chapter.Title = req.Title
	}
	if req.SplitType != nil {
		chapter.SplitType = *req.SplitType
	}
	if req.ColorType != nil {
		chapter.ColorType = *req.ColorType
	}
	if req.DisplayOrder != nil {
		chapter.DisplayOrder = *req.DisplayOrder
	}
	if req.PublishTime != "" {
		chapter.PublishTime = req.PublishTime
	}

	if err := database.DB.Save(&chapter).Error; err != nil {
		InternalError(c, "failed to update chapter")
		return
	}

	Success(c, nil)
}

func DeleteComicChapter(c *gin.Context) {
	id := c.Param("chapterId")
	if id == "" {
		BadRequest(c, "chapter id is required")
		return
	}

	var chapter model.ComicChapter
	if err := database.DB.First(&chapter, id).Error; err != nil {
		NotFound(c, "chapter not found")
		return
	}

	var pages []model.ComicPage
	database.DB.Where("comic_chapter_id = ?", chapter.ID).Find(&pages)
	for _, page := range pages {
		deleteComicPageImage(page.ImageURL)
	}
	database.DB.Where("comic_chapter_id = ?", chapter.ID).Delete(&model.ComicPage{})

	if err := database.DB.Delete(&chapter).Error; err != nil {
		InternalError(c, "failed to delete chapter")
		return
	}

	Success(c, nil)
}

func ListComicPages(c *gin.Context) {
	chapterID := c.Param("chapterId")
	if chapterID == "" {
		BadRequest(c, "chapter id is required")
		return
	}

	var pages []model.ComicPage
	if err := database.DB.Where("comic_chapter_id = ?", chapterID).
		Order("display_order ASC, id ASC").Find(&pages).Error; err != nil {
		InternalError(c, "failed to query pages")
		return
	}

	items := make([]ComicPageData, len(pages))
	for i, p := range pages {
		items[i] = ComicPageData{
			ID:           p.ID,
			ImageURL:     p.ImageURL,
			DisplayOrder: p.DisplayOrder,
		}
	}

	Success(c, items)
}

func CreateComicPage(c *gin.Context) {
	chapterID := c.Param("chapterId")
	if chapterID == "" {
		BadRequest(c, "chapter id is required")
		return
	}

	var req CreateComicPageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	var maxOrder int
	database.DB.Model(&model.ComicPage{}).Where("comic_chapter_id = ?", chapterID).
		Select("COALESCE(MAX(display_order), 0)").Scan(&maxOrder)

	page := model.ComicPage{
		ImageURL:       req.ImageURL,
		DisplayOrder:   maxOrder + 1,
		ComicChapterID: parseUint(chapterID),
	}

	if err := database.DB.Create(&page).Error; err != nil {
		InternalError(c, "failed to create page")
		return
	}

	Success(c, ComicPageData{
		ID:           page.ID,
		ImageURL:     page.ImageURL,
		DisplayOrder: page.DisplayOrder,
	})
}

func UpdateComicPage(c *gin.Context) {
	id := c.Param("pageId")
	if id == "" {
		BadRequest(c, "page id is required")
		return
	}

	var page model.ComicPage
	if err := database.DB.First(&page, id).Error; err != nil {
		NotFound(c, "page not found")
		return
	}

	var req UpdateComicPageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	if req.ImageURL != "" {
		page.ImageURL = req.ImageURL
	}
	if req.DisplayOrder != nil {
		page.DisplayOrder = *req.DisplayOrder
	}

	if err := database.DB.Save(&page).Error; err != nil {
		InternalError(c, "failed to update page")
		return
	}

	Success(c, nil)
}

func DeleteComicPage(c *gin.Context) {
	id := c.Param("pageId")
	if id == "" {
		BadRequest(c, "page id is required")
		return
	}

	var page model.ComicPage
	if err := database.DB.First(&page, id).Error; err != nil {
		NotFound(c, "page not found")
		return
	}

	deleteComicPageImage(page.ImageURL)

	if err := database.DB.Delete(&page).Error; err != nil {
		InternalError(c, "failed to delete page")
		return
	}

	Success(c, nil)
}

type MoveComicPageRequest struct {
	Direction string `json:"direction" binding:"required"`
}

func MoveComicPage(c *gin.Context) {
	id := c.Param("pageId")
	if id == "" {
		BadRequest(c, "page id is required")
		return
	}

	var page model.ComicPage
	if err := database.DB.First(&page, id).Error; err != nil {
		NotFound(c, "page not found")
		return
	}

	var req MoveComicPageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	var sibling model.ComicPage
	if req.Direction == "up" {
		if err := database.DB.Where("comic_chapter_id = ? AND display_order < ?", page.ComicChapterID, page.DisplayOrder).
			Order("display_order DESC").First(&sibling).Error; err != nil {
			BadRequest(c, "already at the first position")
			return
		}
	} else if req.Direction == "down" {
		if err := database.DB.Where("comic_chapter_id = ? AND display_order > ?", page.ComicChapterID, page.DisplayOrder).
			Order("display_order ASC").First(&sibling).Error; err != nil {
			BadRequest(c, "already at the last position")
			return
		}
	} else {
		BadRequest(c, "invalid direction")
		return
	}

	page.DisplayOrder, sibling.DisplayOrder = sibling.DisplayOrder, page.DisplayOrder
	database.DB.Save(&page)
	database.DB.Save(&sibling)

	Success(c, nil)
}

type BatchCreateComicPagesRequest struct {
	ImageURLs []string `json:"imageUrls" binding:"required"`
}

func BatchCreateComicPages(c *gin.Context) {
	chapterID := c.Param("chapterId")
	if chapterID == "" {
		BadRequest(c, "chapter id is required")
		return
	}

	var req BatchCreateComicPagesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	if len(req.ImageURLs) == 0 {
		BadRequest(c, "no images provided")
		return
	}

	var maxOrder int
	database.DB.Model(&model.ComicPage{}).Where("comic_chapter_id = ?", chapterID).
		Select("COALESCE(MAX(display_order), 0)").Scan(&maxOrder)

	pages := make([]model.ComicPage, len(req.ImageURLs))
	for i, url := range req.ImageURLs {
		pages[i] = model.ComicPage{
			ImageURL:       url,
			DisplayOrder:   maxOrder + i + 1,
			ComicChapterID: parseUint(chapterID),
		}
	}

	if err := database.DB.Create(&pages).Error; err != nil {
		InternalError(c, "failed to create pages")
		return
	}

	result := make([]ComicPageData, len(pages))
	for i, p := range pages {
		result[i] = ComicPageData{
			ID:           p.ID,
			ImageURL:     p.ImageURL,
			DisplayOrder: p.DisplayOrder,
		}
	}

	Success(c, result)
}

func GetComicStructure(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "comic id is required")
		return
	}

	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")
	userIDUint := userID.(uint)
	isAdminInt := isAdmin.(int)

	var artifact model.Artifact
	if err := database.DB.First(&artifact, id).Error; err != nil {
		NotFound(c, "comic not found")
		return
	}

	if isAdminInt != 1 {
		hasAccess := false

		if artifact.AccessLevel >= 1 {
			hasAccess = true
		} else {
			var aclCount int64
			database.DB.Model(&model.UserArtifactACL{}).
				Where("artifact_id = ? AND user_id = ?", artifact.ID, userIDUint).
				Count(&aclCount)
			if aclCount > 0 {
				hasAccess = true
			}
		}

		if !hasAccess {
			Forbidden(c, "access denied")
			return
		}
	}

	var volumes []model.ComicVolume
	if err := database.DB.Where("artifact_id = ?", id).
		Order("display_order ASC, id ASC").Find(&volumes).Error; err != nil {
		InternalError(c, "failed to query volumes")
		return
	}

	volumeIDs := make([]uint, len(volumes))
	for i, v := range volumes {
		volumeIDs[i] = v.ID
	}

	var chapters []model.ComicChapter
	if len(volumeIDs) > 0 {
		if err := database.DB.Where("comic_volume_id IN ?", volumeIDs).
			Order("display_order ASC, id ASC").Find(&chapters).Error; err != nil {
			InternalError(c, "failed to query chapters")
			return
		}
	}

	chapterIDs := make([]uint, len(chapters))
	for i, ch := range chapters {
		chapterIDs[i] = ch.ID
	}

	var pages []model.ComicPage
	if len(chapterIDs) > 0 {
		if err := database.DB.Where("comic_chapter_id IN ?", chapterIDs).
			Order("display_order ASC, id ASC").Find(&pages).Error; err != nil {
			InternalError(c, "failed to query pages")
			return
		}
	}

	pageMap := make(map[uint][]ComicPageData)
	for _, p := range pages {
		pageMap[p.ComicChapterID] = append(pageMap[p.ComicChapterID], ComicPageData{
			ID:           p.ID,
			ImageURL:     p.ImageURL,
			DisplayOrder: p.DisplayOrder,
		})
	}

	chapterMap := make(map[uint][]ComicChapterWithPages)
	for _, ch := range chapters {
		pages := pageMap[ch.ID]
		if pages == nil {
			pages = []ComicPageData{}
		}
		chapterMap[ch.ComicVolumeID] = append(chapterMap[ch.ComicVolumeID], ComicChapterWithPages{
			ID:           ch.ID,
			Title:        ch.Title,
			SplitType:    ch.SplitType,
			ColorType:    ch.ColorType,
			DisplayOrder: ch.DisplayOrder,
			PublishTime:  ch.PublishTime,
			Pages:        pages,
		})
	}

	result := make([]ComicVolumeWithChapters, len(volumes))
	for i, v := range volumes {
		chapters := chapterMap[v.ID]
		if chapters == nil {
			chapters = []ComicChapterWithPages{}
		}
		result[i] = ComicVolumeWithChapters{
			ID:           v.ID,
			Title:        v.Title,
			Desc:         v.Desc,
			DisplayOrder: v.DisplayOrder,
			Chapters:     chapters,
		}
	}

	Success(c, result)
}

type ExportComicRequest struct {
	ChapterID uint   `form:"chapter_id" binding:"required"`
	Format    string `form:"format" binding:"required,oneof=zip cbz"`
}

func ExportComicChapter(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "comic id is required")
		return
	}

	var req ExportComicRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		BadRequest(c, "invalid request parameters")
		return
	}

	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")
	userIDUint := userID.(uint)
	isAdminInt := isAdmin.(int)

	var artifact model.Artifact
	if err := database.DB.First(&artifact, id).Error; err != nil {
		NotFound(c, "comic not found")
		return
	}

	if isAdminInt != 1 {
		hasAccess := false
		if artifact.AccessLevel >= 1 {
			hasAccess = true
		} else {
			var aclCount int64
			database.DB.Model(&model.UserArtifactACL{}).
				Where("artifact_id = ? AND user_id = ?", artifact.ID, userIDUint).
				Count(&aclCount)
			if aclCount > 0 {
				hasAccess = true
			}
		}
		if !hasAccess {
			Forbidden(c, "access denied")
			return
		}
	}

	var chapter model.ComicChapter
	if err := database.DB.First(&chapter, req.ChapterID).Error; err != nil {
		NotFound(c, "chapter not found")
		return
	}

	var volume model.ComicVolume
	if err := database.DB.First(&volume, chapter.ComicVolumeID).Error; err != nil {
		NotFound(c, "volume not found")
		return
	}

	if volume.ArtifactID != artifact.ID {
		BadRequest(c, "chapter does not belong to this comic")
		return
	}

	var pages []model.ComicPage
	if err := database.DB.Where("comic_chapter_id = ?", chapter.ID).
		Order("display_order ASC, id ASC").Find(&pages).Error; err != nil {
		InternalError(c, "failed to query pages")
		return
	}

	if len(pages) == 0 {
		BadRequest(c, "no pages in this chapter")
		return
	}

	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)

	if req.Format == "cbz" {
		comicInfo := generateComicInfo(&artifact, &volume, &chapter)
		infoWriter, err := zipWriter.Create("ComicInfo.xml")
		if err != nil {
			InternalError(c, "failed to create ComicInfo.xml")
			return
		}
		_, err = infoWriter.Write([]byte(comicInfo))
		if err != nil {
			InternalError(c, "failed to write ComicInfo.xml")
			return
		}
	}

	for i, page := range pages {
		uploadPath := config.Get().UploadPath()
		imageRelPath := strings.TrimPrefix(page.ImageURL, "/uploads/")
		absPath := filepath.Join(uploadPath, imageRelPath)
		imgData, err := os.ReadFile(absPath)
		if err != nil {
			continue
		}

		ext := ".jpg"
		if strings.HasSuffix(strings.ToLower(page.ImageURL), ".png") {
			ext = ".png"
		} else if strings.HasSuffix(strings.ToLower(page.ImageURL), ".gif") {
			ext = ".gif"
		} else if strings.HasSuffix(strings.ToLower(page.ImageURL), ".webp") {
			ext = ".webp"
		}

		filename := fmt.Sprintf("%04d%s", i+1, ext)
		fileWriter, err := zipWriter.Create(filename)
		if err != nil {
			continue
		}
		fileWriter.Write(imgData)
	}

	zipWriter.Close()

	data := buf.Bytes()

	var filename string
	if req.Format == "cbz" {
		filename = fmt.Sprintf("%s-%s.cbz", artifact.Title, chapter.Title)
	} else {
		filename = fmt.Sprintf("%s-%s.zip", artifact.Title, chapter.Title)
	}

	contentType := "application/zip"
	if req.Format == "cbz" {
		contentType = "application/x-cbz"
	}

	encodedFilename := urlEncode(filename)
	c.Header("Content-Type", contentType)
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+encodedFilename)
	c.Data(200, contentType, data)
}

func urlEncode(s string) string {
	var result strings.Builder
	for _, b := range []byte(s) {
		if (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z') || (b >= '0' && b <= '9') || b == '-' || b == '_' || b == '.' {
			result.WriteByte(b)
		} else {
			result.WriteString(fmt.Sprintf("%%%02X", b))
		}
	}
	return result.String()
}

func generateComicInfo(artifact *model.Artifact, volume *model.ComicVolume, chapter *model.ComicChapter) string {
	var writer strings.Builder
	writer.WriteString(`<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
`)
	writer.WriteString("  <Title>")
	writer.WriteString(htmlEscape(chapter.Title))
	writer.WriteString("</Title>\n")

	writer.WriteString("  <Series>")
	writer.WriteString(htmlEscape(artifact.Title))
	writer.WriteString("</Series>\n")

	if artifact.Author != "" {
		writer.WriteString("  <Writer>")
		writer.WriteString(htmlEscape(artifact.Author))
		writer.WriteString("</Writer>\n")
	}

	if artifact.Desc != "" {
		writer.WriteString("  <Summary>")
		writer.WriteString(htmlEscape(artifact.Desc))
		writer.WriteString("</Summary>\n")
	}

	if volume.Title != "" {
		writer.WriteString("  <Volume>")
		writer.WriteString(htmlEscape(volume.Title))
		writer.WriteString("</Volume>\n")
	}

	if artifact.PublishTime != "" {
		writer.WriteString("  <Year>")
		writer.WriteString(strings.Split(artifact.PublishTime, "-")[0])
		writer.WriteString("</Year>\n")
	}

	if artifact.IsCompleted == 1 {
		writer.WriteString("  <Manga>Yes</Manga>\n")
	} else {
		writer.WriteString("  <Manga>YesAndRightToLeft</Manga>\n")
	}

	writer.WriteString("</ComicInfo>")
	return writer.String()
}

func htmlEscape(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	s = strings.ReplaceAll(s, "'", "&#39;")
	return s
}
