package handler

import (
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

type AnimationListItem struct {
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

type ListAnimationsRequest struct {
	Keyword    string `form:"keyword"`
	TagIDs     string `form:"tag_ids"`
	IsComplete *int   `form:"is_complete"`
	Page       int    `form:"page"`
	PageSize   int    `form:"page_size"`
}

type ListAnimationsResponse struct {
	Items    []AnimationListItem `json:"items"`
	Total    int64               `json:"total"`
	Page     int                 `json:"page"`
	PageSize int                 `json:"pageSize"`
}

type CreateAnimationRequest struct {
	Title       string `json:"title" binding:"required"`
	Desc        string `json:"desc"`
	Author      string `json:"author"`
	CoverImgURL string `json:"coverImgUrl"`
	IsCompleted int    `json:"isCompleted"`
	AccessLevel int    `json:"accessLevel"`
	PublishTime string `json:"publishTime"`
	TagIDs      []uint `json:"tagIds"`
}

type UpdateAnimationRequest struct {
	Title       string `json:"title"`
	Desc        string `json:"desc"`
	Author      string `json:"author"`
	CoverImgURL string `json:"coverImgUrl"`
	IsCompleted *int   `json:"isCompleted"`
	AccessLevel *int   `json:"accessLevel"`
	PublishTime string `json:"publishTime"`
	TagIDs      []uint `json:"tagIds"`
}

type AnimationVolumeData struct {
	ID           uint   `json:"id"`
	Title        string `json:"title"`
	Desc         string `json:"desc"`
	DisplayOrder int    `json:"displayOrder"`
}

type AnimationChapterData struct {
	ID           uint   `json:"id"`
	Title        string `json:"title"`
	VideoURL     string `json:"videoUrl"`
	DisplayOrder int    `json:"displayOrder"`
	PublishTime  string `json:"publishTime"`
}

type TagData struct {
	ID           uint   `json:"id"`
	Name         string `json:"name"`
	IsCatalog    int    `json:"isCatalog"`
	TagImgURL    string `json:"tagImgUrl"`
	DisplayOrder int    `json:"displayOrder"`
}

type AnimationDetailResponse struct {
	ID          uint                  `json:"id"`
	Title       string                `json:"title"`
	Desc        string                `json:"desc"`
	Author      string                `json:"author"`
	CoverImgURL string                `json:"coverImgUrl"`
	IsCompleted int                   `json:"isCompleted"`
	AccessLevel int                   `json:"accessLevel"`
	PublishTime string                `json:"publishTime"`
	Volumes     []AnimationVolumeData `json:"volumes"`
	Tags        []TagData             `json:"tags"`
}

type CreateAnimationVolumeRequest struct {
	Title        string `json:"title" binding:"required"`
	Desc         string `json:"desc"`
	DisplayOrder int    `json:"displayOrder"`
}

type UpdateAnimationVolumeRequest struct {
	Title        string `json:"title"`
	Desc         string `json:"desc"`
	DisplayOrder *int   `json:"displayOrder"`
}

type CreateAnimationChapterRequest struct {
	Title        string `json:"title" binding:"required"`
	VideoURL     string `json:"videoUrl"`
	DisplayOrder int    `json:"displayOrder"`
	PublishTime  string `json:"publishTime"`
}

type UpdateAnimationChapterRequest struct {
	Title        string `json:"title"`
	VideoURL     string `json:"videoUrl"`
	DisplayOrder *int   `json:"displayOrder"`
	PublishTime  string `json:"publishTime"`
}

type AnimationVolumeWithChapters struct {
	ID           uint                   `json:"id"`
	Title        string                 `json:"title"`
	Desc         string                 `json:"desc"`
	DisplayOrder int                    `json:"displayOrder"`
	Chapters     []AnimationChapterData `json:"chapters"`
}

func ListAnimations(c *gin.Context) {
	var req ListAnimationsRequest
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

	query := database.DB.Model(&model.Artifact{}).Where("content_type = ?", model.ContentTypeAnimation)

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
		InternalError(c, "failed to query animations")
		return
	}

	items := make([]AnimationListItem, len(artifacts))
	for i, a := range artifacts {
		var volumeCount, chapterCount int64
		database.DB.Model(&model.AnimationVolume{}).Where("artifact_id = ?", a.ID).Count(&volumeCount)
		database.DB.Table("animation_chapter").
			Joins("JOIN animation_volume ON animation_chapter.animation_volume_id = animation_volume.id").
			Where("animation_volume.artifact_id = ?", a.ID).
			Count(&chapterCount)

		items[i] = AnimationListItem{
			ID:           a.ID,
			Title:        a.Title,
			Desc:         a.Desc,
			Author:       a.Author,
			CoverImgURL:  a.CoverImgURL,
			IsCompleted:  a.IsCompleted,
			AccessLevel:  a.AccessLevel,
			PublishTime:  FormatDateTime(a.PublishTime),
			VolumeCount:  volumeCount,
			ChapterCount: chapterCount,
		}
	}

	Success(c, ListAnimationsResponse{Items: items, Total: total, Page: req.Page, PageSize: req.PageSize})
}

func CreateAnimation(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req CreateAnimationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	now := time.Now()
	artifact := model.Artifact{
		ContentType: model.ContentTypeAnimation,
		Title:       req.Title,
		Desc:        req.Desc,
		Author:      req.Author,
		CoverImgURL: req.CoverImgURL,
		IsCompleted: req.IsCompleted,
		UserID:      userID,
		AccessLevel: req.AccessLevel,
		CreateTime:  now,
		UpdateTime:  now,
	}

	if req.PublishTime != "" {
		if publishTime, err := ParseDateTime(req.PublishTime); err == nil {
			artifact.PublishTime = publishTime
		} else {
			artifact.PublishTime = now
		}
	} else {
		artifact.PublishTime = now
	}

	if err := database.DB.Create(&artifact).Error; err != nil {
		InternalError(c, "failed to create animation")
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

func GetAnimation(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "animation id is required")
		return
	}

	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")
	userIDUint := userID.(uint)
	isAdminInt := isAdmin.(int)

	var artifact model.Artifact
	if err := database.DB.Preload("Tags").First(&artifact, id).Error; err != nil {
		NotFound(c, "animation not found")
		return
	}

	if artifact.ContentType != model.ContentTypeAnimation {
		BadRequest(c, "not an animation")
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

	var volumes []model.AnimationVolume
	if err := database.DB.Where("artifact_id = ?", artifact.ID).
		Order("display_order ASC, id ASC").Find(&volumes).Error; err != nil {
		InternalError(c, "failed to query volumes")
		return
	}

	volumeData := make([]AnimationVolumeData, len(volumes))
	for i, v := range volumes {
		volumeData[i] = AnimationVolumeData{
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

	Success(c, AnimationDetailResponse{
		ID:          artifact.ID,
		Title:       artifact.Title,
		Desc:        artifact.Desc,
		Author:      artifact.Author,
		CoverImgURL: artifact.CoverImgURL,
		IsCompleted: artifact.IsCompleted,
		AccessLevel: artifact.AccessLevel,
		PublishTime: FormatDateTime(artifact.PublishTime),
		Volumes:     volumeData,
		Tags:        tagData,
	})
}

func UpdateAnimation(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "animation id is required")
		return
	}

	var artifact model.Artifact
	if err := database.DB.First(&artifact, id).Error; err != nil {
		NotFound(c, "animation not found")
		return
	}

	if artifact.ContentType != model.ContentTypeAnimation {
		BadRequest(c, "not an animation")
		return
	}

	var req UpdateAnimationRequest
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
		if publishTime, err := ParseDateTime(req.PublishTime); err == nil {
			artifact.PublishTime = publishTime
		}
	}
	artifact.UpdateTime = time.Now()

	if err := database.DB.Save(&artifact).Error; err != nil {
		InternalError(c, "failed to update animation")
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

func DeleteAnimation(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "animation id is required")
		return
	}

	var artifact model.Artifact
	if err := database.DB.First(&artifact, id).Error; err != nil {
		NotFound(c, "animation not found")
		return
	}

	if artifact.ContentType != model.ContentTypeAnimation {
		BadRequest(c, "not an animation")
		return
	}

	var volumeIDs []uint
	database.DB.Model(&model.AnimationVolume{}).Where("artifact_id = ?", artifact.ID).Pluck("id", &volumeIDs)

	if len(volumeIDs) > 0 {
		var chapters []model.AnimationChapter
		database.DB.Where("animation_volume_id IN ?", volumeIDs).Find(&chapters)
		for _, chapter := range chapters {
			deleteAnimationVideo(chapter.VideoURL)
		}
		database.DB.Where("animation_volume_id IN ?", volumeIDs).Delete(&model.AnimationChapter{})
		database.DB.Where("artifact_id = ?", artifact.ID).Delete(&model.AnimationVolume{})
	}

	database.DB.Where("artifact_id = ?", artifact.ID).Delete(&model.ArtifactTag{})

	if err := database.DB.Delete(&artifact).Error; err != nil {
		InternalError(c, "failed to delete animation")
		return
	}

	Success(c, nil)
}

func ListAnimationVolumes(c *gin.Context) {
	artifactID := c.Param("id")
	if artifactID == "" {
		BadRequest(c, "animation id is required")
		return
	}

	var volumes []model.AnimationVolume
	if err := database.DB.Where("artifact_id = ?", artifactID).
		Order("display_order ASC, id ASC").Find(&volumes).Error; err != nil {
		InternalError(c, "failed to query volumes")
		return
	}

	items := make([]AnimationVolumeData, len(volumes))
	for i, v := range volumes {
		items[i] = AnimationVolumeData{
			ID:           v.ID,
			Title:        v.Title,
			Desc:         v.Desc,
			DisplayOrder: v.DisplayOrder,
		}
	}

	Success(c, items)
}

func CreateAnimationVolume(c *gin.Context) {
	artifactID := c.Param("id")
	if artifactID == "" {
		BadRequest(c, "animation id is required")
		return
	}

	var req CreateAnimationVolumeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	var maxOrder int
	database.DB.Model(&model.AnimationVolume{}).Where("artifact_id = ?", artifactID).
		Select("COALESCE(MAX(display_order), 0)").Scan(&maxOrder)

	volume := model.AnimationVolume{
		Title:        req.Title,
		Desc:         req.Desc,
		DisplayOrder: maxOrder + 1,
		ArtifactID:   parseUint(artifactID),
	}

	if err := database.DB.Create(&volume).Error; err != nil {
		InternalError(c, "failed to create volume")
		return
	}

	Success(c, AnimationVolumeData{
		ID:           volume.ID,
		Title:        volume.Title,
		Desc:         volume.Desc,
		DisplayOrder: volume.DisplayOrder,
	})
}

func UpdateAnimationVolume(c *gin.Context) {
	id := c.Param("volumeId")
	if id == "" {
		BadRequest(c, "volume id is required")
		return
	}

	var volume model.AnimationVolume
	if err := database.DB.First(&volume, id).Error; err != nil {
		NotFound(c, "volume not found")
		return
	}

	var req UpdateAnimationVolumeRequest
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

func DeleteAnimationVolume(c *gin.Context) {
	id := c.Param("volumeId")
	if id == "" {
		BadRequest(c, "volume id is required")
		return
	}

	var volume model.AnimationVolume
	if err := database.DB.First(&volume, id).Error; err != nil {
		NotFound(c, "volume not found")
		return
	}

	var chapters []model.AnimationChapter
	database.DB.Where("animation_volume_id = ?", volume.ID).Find(&chapters)
	for _, chapter := range chapters {
		deleteAnimationVideo(chapter.VideoURL)
	}
	database.DB.Where("animation_volume_id = ?", volume.ID).Delete(&model.AnimationChapter{})

	if err := database.DB.Delete(&volume).Error; err != nil {
		InternalError(c, "failed to delete volume")
		return
	}

	Success(c, nil)
}

func ListAnimationChapters(c *gin.Context) {
	volumeID := c.Param("volumeId")
	if volumeID == "" {
		BadRequest(c, "volume id is required")
		return
	}

	var chapters []model.AnimationChapter
	if err := database.DB.Where("animation_volume_id = ?", volumeID).
		Order("display_order ASC, id ASC").Find(&chapters).Error; err != nil {
		InternalError(c, "failed to query chapters")
		return
	}

	items := make([]AnimationChapterData, len(chapters))
	for i, ch := range chapters {
		items[i] = AnimationChapterData{
			ID:           ch.ID,
			Title:        ch.Title,
			VideoURL:     ch.VideoURL,
			DisplayOrder: ch.DisplayOrder,
			PublishTime:  FormatDateTime(ch.PublishTime),
		}
	}

	Success(c, items)
}

func GetAnimationChapter(c *gin.Context) {
	id := c.Param("chapterId")
	if id == "" {
		BadRequest(c, "chapter id is required")
		return
	}

	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")
	userIDUint := userID.(uint)
	isAdminInt := isAdmin.(int)

	var chapter model.AnimationChapter
	if err := database.DB.First(&chapter, id).Error; err != nil {
		NotFound(c, "chapter not found")
		return
	}

	var volume model.AnimationVolume
	if err := database.DB.First(&volume, chapter.AnimationVolumeID).Error; err != nil {
		NotFound(c, "volume not found")
		return
	}

	var artifact model.Artifact
	if err := database.DB.First(&artifact, volume.ArtifactID).Error; err != nil {
		NotFound(c, "animation not found")
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

	Success(c, AnimationChapterData{
		ID:           chapter.ID,
		Title:        chapter.Title,
		VideoURL:     chapter.VideoURL,
		DisplayOrder: chapter.DisplayOrder,
		PublishTime:  FormatDateTime(chapter.PublishTime),
	})
}

func CreateAnimationChapter(c *gin.Context) {
	volumeID := c.Param("volumeId")
	if volumeID == "" {
		BadRequest(c, "volume id is required")
		return
	}

	var req CreateAnimationChapterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	var maxOrder int
	database.DB.Model(&model.AnimationChapter{}).Where("animation_volume_id = ?", volumeID).
		Select("COALESCE(MAX(display_order), 0)").Scan(&maxOrder)

	chapter := model.AnimationChapter{
		Title:             req.Title,
		VideoURL:          req.VideoURL,
		DisplayOrder:      maxOrder + 1,
		AnimationVolumeID: parseUint(volumeID),
	}

	if req.PublishTime != "" {
		if publishTime, err := ParseDateTime(req.PublishTime); err == nil {
			chapter.PublishTime = publishTime
		}
	}

	if err := database.DB.Create(&chapter).Error; err != nil {
		InternalError(c, "failed to create chapter")
		return
	}

	Success(c, AnimationChapterData{
		ID:           chapter.ID,
		Title:        chapter.Title,
		VideoURL:     chapter.VideoURL,
		DisplayOrder: chapter.DisplayOrder,
		PublishTime:  FormatDateTime(chapter.PublishTime),
	})
}

func UpdateAnimationChapter(c *gin.Context) {
	id := c.Param("chapterId")
	if id == "" {
		BadRequest(c, "chapter id is required")
		return
	}

	var chapter model.AnimationChapter
	if err := database.DB.First(&chapter, id).Error; err != nil {
		NotFound(c, "chapter not found")
		return
	}

	var req UpdateAnimationChapterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	if req.Title != "" {
		chapter.Title = req.Title
	}
	if req.VideoURL != "" {
		chapter.VideoURL = req.VideoURL
	}
	if req.DisplayOrder != nil {
		chapter.DisplayOrder = *req.DisplayOrder
	}
	if req.PublishTime != "" {
		if publishTime, err := ParseDateTime(req.PublishTime); err == nil {
			chapter.PublishTime = publishTime
		}
	}

	if err := database.DB.Save(&chapter).Error; err != nil {
		InternalError(c, "failed to update chapter")
		return
	}

	Success(c, nil)
}

func DeleteAnimationChapter(c *gin.Context) {
	id := c.Param("chapterId")
	if id == "" {
		BadRequest(c, "chapter id is required")
		return
	}

	var chapter model.AnimationChapter
	if err := database.DB.First(&chapter, id).Error; err != nil {
		NotFound(c, "chapter not found")
		return
	}

	deleteAnimationVideo(chapter.VideoURL)

	if err := database.DB.Delete(&chapter).Error; err != nil {
		InternalError(c, "failed to delete chapter")
		return
	}

	Success(c, nil)
}

func GetAnimationStructure(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "animation id is required")
		return
	}

	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")
	userIDUint := userID.(uint)
	isAdminInt := isAdmin.(int)

	var artifact model.Artifact
	if err := database.DB.First(&artifact, id).Error; err != nil {
		NotFound(c, "animation not found")
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

	var volumes []model.AnimationVolume
	if err := database.DB.Where("artifact_id = ?", id).
		Order("display_order ASC, id ASC").Find(&volumes).Error; err != nil {
		InternalError(c, "failed to query volumes")
		return
	}

	volumeIDs := make([]uint, len(volumes))
	for i, v := range volumes {
		volumeIDs[i] = v.ID
	}

	var chapters []model.AnimationChapter
	if len(volumeIDs) > 0 {
		if err := database.DB.Where("animation_volume_id IN ?", volumeIDs).
			Order("display_order ASC, id ASC").Find(&chapters).Error; err != nil {
			InternalError(c, "failed to query chapters")
			return
		}
	}

	chapterMap := make(map[uint][]AnimationChapterData)
	for _, ch := range chapters {
		chapterMap[ch.AnimationVolumeID] = append(chapterMap[ch.AnimationVolumeID], AnimationChapterData{
			ID:           ch.ID,
			Title:        ch.Title,
			VideoURL:     ch.VideoURL,
			DisplayOrder: ch.DisplayOrder,
			PublishTime:  FormatDateTime(ch.PublishTime),
		})
	}

	result := make([]AnimationVolumeWithChapters, len(volumes))
	for i, v := range volumes {
		chapters := chapterMap[v.ID]
		if chapters == nil {
			chapters = []AnimationChapterData{}
		}
		result[i] = AnimationVolumeWithChapters{
			ID:           v.ID,
			Title:        v.Title,
			Desc:         v.Desc,
			DisplayOrder: v.DisplayOrder,
			Chapters:     chapters,
		}
	}

	Success(c, result)
}

type ExportAnimationRequest struct {
	ChapterID uint `form:"chapter_id" binding:"required"`
}

func ExportAnimationChapter(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "animation id is required")
		return
	}

	var req ExportAnimationRequest
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
		NotFound(c, "animation not found")
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

	var chapter model.AnimationChapter
	if err := database.DB.First(&chapter, req.ChapterID).Error; err != nil {
		NotFound(c, "chapter not found")
		return
	}

	var volume model.AnimationVolume
	if err := database.DB.First(&volume, chapter.AnimationVolumeID).Error; err != nil {
		NotFound(c, "volume not found")
		return
	}

	if volume.ArtifactID != artifact.ID {
		BadRequest(c, "chapter does not belong to this animation")
		return
	}

	if chapter.VideoURL == "" {
		BadRequest(c, "no video for this chapter")
		return
	}

	uploadPath := config.Get().UploadPath()
	videoRelPath := strings.TrimPrefix(chapter.VideoURL, "/uploads/")
	absPath := filepath.Join(uploadPath, videoRelPath)

	fileInfo, err := os.Stat(absPath)
	if err != nil {
		NotFound(c, "video file not found")
		return
	}

	ext := filepath.Ext(absPath)
	filename := fmt.Sprintf("%s-%s%s", artifact.Title, chapter.Title, ext)
	encodedFilename := urlEncodeFilename(filename)

	contentType := "video/mp4"
	if ext == ".webm" {
		contentType = "video/webm"
	} else if ext == ".mkv" {
		contentType = "video/x-matroska"
	} else if ext == ".avi" {
		contentType = "video/x-msvideo"
	}

	c.Header("Content-Type", contentType)
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+encodedFilename)
	c.Header("Content-Length", strconv.FormatInt(fileInfo.Size(), 10))
	c.File(absPath)
}

func urlEncodeFilename(s string) string {
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
