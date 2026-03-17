package handler

import (
	"comicfun/internal/database"
	"comicfun/internal/model"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type NovelListItem struct {
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

type ListNovelsRequest struct {
	Keyword    string `form:"keyword"`
	TagIDs     string `form:"tag_ids"`
	IsComplete *int   `form:"is_complete"`
	Page       int    `form:"page"`
	PageSize   int    `form:"page_size"`
}

type ListNovelsResponse struct {
	Items    []NovelListItem `json:"items"`
	Total    int64           `json:"total"`
	Page     int             `json:"page"`
	PageSize int             `json:"pageSize"`
}

type CreateNovelRequest struct {
	Title       string `json:"title" binding:"required"`
	Desc        string `json:"desc"`
	Author      string `json:"author"`
	CoverImgURL string `json:"coverImgUrl"`
	IsCompleted int    `json:"isCompleted"`
	AccessLevel int    `json:"accessLevel"`
	PublishTime string `json:"publishTime"`
	TagIDs      []uint `json:"tagIds"`
}

type UpdateNovelRequest struct {
	Title       string `json:"title"`
	Desc        string `json:"desc"`
	Author      string `json:"author"`
	CoverImgURL string `json:"coverImgUrl"`
	IsCompleted *int   `json:"isCompleted"`
	AccessLevel *int   `json:"accessLevel"`
	PublishTime string `json:"publishTime"`
	TagIDs      []uint `json:"tagIds"`
}

type NovelVolumeData struct {
	ID           uint   `json:"id"`
	Title        string `json:"title"`
	Desc         string `json:"desc"`
	DisplayOrder int    `json:"displayOrder"`
}

type NovelChapterData struct {
	ID           uint   `json:"id"`
	Title        string `json:"title"`
	Content      string `json:"content"`
	DisplayOrder int    `json:"displayOrder"`
	PublishTime  string `json:"publishTime"`
}

type NovelDetailResponse struct {
	ID          uint              `json:"id"`
	Title       string            `json:"title"`
	Desc        string            `json:"desc"`
	Author      string            `json:"author"`
	CoverImgURL string            `json:"coverImgUrl"`
	IsCompleted int               `json:"isCompleted"`
	AccessLevel int               `json:"accessLevel"`
	PublishTime string            `json:"publishTime"`
	Volumes     []NovelVolumeData `json:"volumes"`
	Tags        []TagData         `json:"tags"`
}

type CreateVolumeRequest struct {
	Title        string `json:"title" binding:"required"`
	Desc         string `json:"desc"`
	DisplayOrder int    `json:"displayOrder"`
}

type UpdateVolumeRequest struct {
	Title        string `json:"title"`
	Desc         string `json:"desc"`
	DisplayOrder *int   `json:"displayOrder"`
}

type CreateChapterRequest struct {
	Title        string `json:"title" binding:"required"`
	Content      string `json:"content"`
	DisplayOrder int    `json:"displayOrder"`
	PublishTime  string `json:"publishTime"`
}

type UpdateChapterRequest struct {
	Title        string `json:"title"`
	Content      string `json:"content"`
	DisplayOrder *int   `json:"displayOrder"`
	PublishTime  string `json:"publishTime"`
}

type VolumeWithChapters struct {
	ID           uint               `json:"id"`
	Title        string             `json:"title"`
	Desc         string             `json:"desc"`
	DisplayOrder int                `json:"displayOrder"`
	Chapters     []NovelChapterData `json:"chapters"`
}

func ListNovels(c *gin.Context) {
	var req ListNovelsRequest
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

	query := database.DB.Model(&model.Artifact{}).Where("content_type = ?", model.ContentTypeNovel)

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
		InternalError(c, "failed to query novels")
		return
	}

	items := make([]NovelListItem, len(artifacts))
	for i, a := range artifacts {
		var volumeCount, chapterCount int64
		database.DB.Model(&model.NovelVolume{}).Where("artifact_id = ?", a.ID).Count(&volumeCount)
		database.DB.Table("novel_chapter").
			Joins("JOIN novel_volume ON novel_chapter.novel_volume_id = novel_volume.id").
			Where("novel_volume.artifact_id = ?", a.ID).
			Count(&chapterCount)

		items[i] = NovelListItem{
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

	Success(c, ListNovelsResponse{Items: items, Total: total, Page: req.Page, PageSize: req.PageSize})
}

func CreateNovel(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req CreateNovelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	now := time.Now().Format("2006-01-02 15:04:05")
	artifact := model.Artifact{
		ContentType: model.ContentTypeNovel,
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
		InternalError(c, "failed to create novel")
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

func GetNovel(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "novel id is required")
		return
	}

	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")
	userIDUint := userID.(uint)
	isAdminInt := isAdmin.(int)

	var artifact model.Artifact
	if err := database.DB.Preload("Tags").First(&artifact, id).Error; err != nil {
		NotFound(c, "novel not found")
		return
	}

	if artifact.ContentType != model.ContentTypeNovel {
		BadRequest(c, "not a novel")
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

	var volumes []model.NovelVolume
	if err := database.DB.Where("artifact_id = ?", artifact.ID).
		Order("display_order ASC, id ASC").Find(&volumes).Error; err != nil {
		InternalError(c, "failed to query volumes")
		return
	}

	volumeData := make([]NovelVolumeData, len(volumes))
	for i, v := range volumes {
		volumeData[i] = NovelVolumeData{
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

	Success(c, NovelDetailResponse{
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

func UpdateNovel(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "novel id is required")
		return
	}

	var artifact model.Artifact
	if err := database.DB.First(&artifact, id).Error; err != nil {
		NotFound(c, "novel not found")
		return
	}

	if artifact.ContentType != model.ContentTypeNovel {
		BadRequest(c, "not a novel")
		return
	}

	var req UpdateNovelRequest
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
		InternalError(c, "failed to update novel")
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

func DeleteNovel(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "novel id is required")
		return
	}

	var artifact model.Artifact
	if err := database.DB.First(&artifact, id).Error; err != nil {
		NotFound(c, "novel not found")
		return
	}

	if artifact.ContentType != model.ContentTypeNovel {
		BadRequest(c, "not a novel")
		return
	}

	var volumeIDs []uint
	database.DB.Model(&model.NovelVolume{}).Where("artifact_id = ?", artifact.ID).Pluck("id", &volumeIDs)

	if len(volumeIDs) > 0 {
		database.DB.Where("novel_volume_id IN ?", volumeIDs).Delete(&model.NovelChapter{})
		database.DB.Where("artifact_id = ?", artifact.ID).Delete(&model.NovelVolume{})
	}

	database.DB.Where("artifact_id = ?", artifact.ID).Delete(&model.ArtifactTag{})

	if err := database.DB.Delete(&artifact).Error; err != nil {
		InternalError(c, "failed to delete novel")
		return
	}

	Success(c, nil)
}

func ListVolumes(c *gin.Context) {
	artifactID := c.Param("id")
	if artifactID == "" {
		BadRequest(c, "novel id is required")
		return
	}

	var volumes []model.NovelVolume
	if err := database.DB.Where("artifact_id = ?", artifactID).
		Order("display_order ASC, id ASC").Find(&volumes).Error; err != nil {
		InternalError(c, "failed to query volumes")
		return
	}

	items := make([]NovelVolumeData, len(volumes))
	for i, v := range volumes {
		items[i] = NovelVolumeData{
			ID:           v.ID,
			Title:        v.Title,
			Desc:         v.Desc,
			DisplayOrder: v.DisplayOrder,
		}
	}

	Success(c, items)
}

func CreateVolume(c *gin.Context) {
	artifactID := c.Param("id")
	if artifactID == "" {
		BadRequest(c, "novel id is required")
		return
	}

	var req CreateVolumeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	var maxOrder int
	database.DB.Model(&model.NovelVolume{}).Where("artifact_id = ?", artifactID).
		Select("COALESCE(MAX(display_order), 0)").Scan(&maxOrder)

	volume := model.NovelVolume{
		Title:        req.Title,
		Desc:         req.Desc,
		DisplayOrder: maxOrder + 1,
		ArtifactID:   parseUint(artifactID),
	}

	if err := database.DB.Create(&volume).Error; err != nil {
		InternalError(c, "failed to create volume")
		return
	}

	Success(c, NovelVolumeData{
		ID:           volume.ID,
		Title:        volume.Title,
		Desc:         volume.Desc,
		DisplayOrder: volume.DisplayOrder,
	})
}

func UpdateVolume(c *gin.Context) {
	id := c.Param("volumeId")
	if id == "" {
		BadRequest(c, "volume id is required")
		return
	}

	var volume model.NovelVolume
	if err := database.DB.First(&volume, id).Error; err != nil {
		NotFound(c, "volume not found")
		return
	}

	var req UpdateVolumeRequest
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

func DeleteVolume(c *gin.Context) {
	id := c.Param("volumeId")
	if id == "" {
		BadRequest(c, "volume id is required")
		return
	}

	var volume model.NovelVolume
	if err := database.DB.First(&volume, id).Error; err != nil {
		NotFound(c, "volume not found")
		return
	}

	database.DB.Where("novel_volume_id = ?", volume.ID).Delete(&model.NovelChapter{})

	if err := database.DB.Delete(&volume).Error; err != nil {
		InternalError(c, "failed to delete volume")
		return
	}

	Success(c, nil)
}

func ListChapters(c *gin.Context) {
	volumeID := c.Param("volumeId")
	if volumeID == "" {
		BadRequest(c, "volume id is required")
		return
	}

	var chapters []model.NovelChapter
	if err := database.DB.Where("novel_volume_id = ?", volumeID).
		Order("display_order ASC, id ASC").Find(&chapters).Error; err != nil {
		InternalError(c, "failed to query chapters")
		return
	}

	items := make([]NovelChapterData, len(chapters))
	for i, ch := range chapters {
		items[i] = NovelChapterData{
			ID:           ch.ID,
			Title:        ch.Title,
			Content:      ch.Content,
			DisplayOrder: ch.DisplayOrder,
			PublishTime:  ch.PublishTime,
		}
	}

	Success(c, items)
}

func GetChapter(c *gin.Context) {
	id := c.Param("chapterId")
	if id == "" {
		BadRequest(c, "chapter id is required")
		return
	}

	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")
	userIDUint := userID.(uint)
	isAdminInt := isAdmin.(int)

	var chapter model.NovelChapter
	if err := database.DB.First(&chapter, id).Error; err != nil {
		NotFound(c, "chapter not found")
		return
	}

	var volume model.NovelVolume
	if err := database.DB.First(&volume, chapter.NovelVolumeID).Error; err != nil {
		NotFound(c, "volume not found")
		return
	}

	var artifact model.Artifact
	if err := database.DB.First(&artifact, volume.ArtifactID).Error; err != nil {
		NotFound(c, "novel not found")
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

	Success(c, NovelChapterData{
		ID:           chapter.ID,
		Title:        chapter.Title,
		Content:      chapter.Content,
		DisplayOrder: chapter.DisplayOrder,
		PublishTime:  chapter.PublishTime,
	})
}

func CreateChapter(c *gin.Context) {
	volumeID := c.Param("volumeId")
	if volumeID == "" {
		BadRequest(c, "volume id is required")
		return
	}

	var req CreateChapterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	var maxOrder int
	database.DB.Model(&model.NovelChapter{}).Where("novel_volume_id = ?", volumeID).
		Select("COALESCE(MAX(display_order), 0)").Scan(&maxOrder)

	chapter := model.NovelChapter{
		Title:         req.Title,
		Content:       req.Content,
		DisplayOrder:  maxOrder + 1,
		NovelVolumeID: parseUint(volumeID),
		PublishTime:   req.PublishTime,
	}

	if err := database.DB.Create(&chapter).Error; err != nil {
		InternalError(c, "failed to create chapter")
		return
	}

	Success(c, NovelChapterData{
		ID:           chapter.ID,
		Title:        chapter.Title,
		Content:      chapter.Content,
		DisplayOrder: chapter.DisplayOrder,
		PublishTime:  chapter.PublishTime,
	})
}

func UpdateChapter(c *gin.Context) {
	id := c.Param("chapterId")
	if id == "" {
		BadRequest(c, "chapter id is required")
		return
	}

	var chapter model.NovelChapter
	if err := database.DB.First(&chapter, id).Error; err != nil {
		NotFound(c, "chapter not found")
		return
	}

	var req UpdateChapterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	if req.Title != "" {
		chapter.Title = req.Title
	}
	if req.Content != "" {
		chapter.Content = req.Content
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

func DeleteChapter(c *gin.Context) {
	id := c.Param("chapterId")
	if id == "" {
		BadRequest(c, "chapter id is required")
		return
	}

	var chapter model.NovelChapter
	if err := database.DB.First(&chapter, id).Error; err != nil {
		NotFound(c, "chapter not found")
		return
	}

	if err := database.DB.Delete(&chapter).Error; err != nil {
		InternalError(c, "failed to delete chapter")
		return
	}

	Success(c, nil)
}

func GetNovelStructure(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "novel id is required")
		return
	}

	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")
	userIDUint := userID.(uint)
	isAdminInt := isAdmin.(int)

	var artifact model.Artifact
	if err := database.DB.First(&artifact, id).Error; err != nil {
		NotFound(c, "novel not found")
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

	var volumes []model.NovelVolume
	if err := database.DB.Where("artifact_id = ?", id).
		Order("display_order ASC, id ASC").Find(&volumes).Error; err != nil {
		InternalError(c, "failed to query volumes")
		return
	}

	volumeIDs := make([]uint, len(volumes))
	for i, v := range volumes {
		volumeIDs[i] = v.ID
	}

	var chapters []model.NovelChapter
	if len(volumeIDs) > 0 {
		if err := database.DB.Where("novel_volume_id IN ?", volumeIDs).
			Order("display_order ASC, id ASC").Find(&chapters).Error; err != nil {
			InternalError(c, "failed to query chapters")
			return
		}
	}

	chapterMap := make(map[uint][]NovelChapterData)
	for _, ch := range chapters {
		chapterMap[ch.NovelVolumeID] = append(chapterMap[ch.NovelVolumeID], NovelChapterData{
			ID:           ch.ID,
			Title:        ch.Title,
			Content:      ch.Content,
			DisplayOrder: ch.DisplayOrder,
			PublishTime:  ch.PublishTime,
		})
	}

	result := make([]VolumeWithChapters, len(volumes))
	for i, v := range volumes {
		chapters := chapterMap[v.ID]
		if chapters == nil {
			chapters = []NovelChapterData{}
		}
		result[i] = VolumeWithChapters{
			ID:           v.ID,
			Title:        v.Title,
			Desc:         v.Desc,
			DisplayOrder: v.DisplayOrder,
			Chapters:     chapters,
		}
	}

	Success(c, result)
}

func parseUint(s string) uint {
	var result uint
	for _, c := range s {
		if c >= '0' && c <= '9' {
			result = result*10 + uint(c-'0')
		}
	}
	return result
}

func ExportNovelTxt(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "novel id is required")
		return
	}

	userID, _ := c.Get("user_id")
	isAdmin, _ := c.Get("is_admin")
	userIDUint := userID.(uint)
	isAdminInt := isAdmin.(int)

	var artifact model.Artifact
	if err := database.DB.First(&artifact, id).Error; err != nil {
		NotFound(c, "novel not found")
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

	var volumes []model.NovelVolume
	if err := database.DB.Where("artifact_id = ?", id).
		Order("display_order ASC, id ASC").Find(&volumes).Error; err != nil {
		InternalError(c, "failed to query volumes")
		return
	}

	volumeIDs := make([]uint, len(volumes))
	for i, v := range volumes {
		volumeIDs[i] = v.ID
	}

	var chapters []model.NovelChapter
	if len(volumeIDs) > 0 {
		if err := database.DB.Where("novel_volume_id IN ?", volumeIDs).
			Order("display_order ASC, id ASC").Find(&chapters).Error; err != nil {
			InternalError(c, "failed to query chapters")
			return
		}
	}

	chapterMap := make(map[uint][]model.NovelChapter)
	for _, ch := range chapters {
		chapterMap[ch.NovelVolumeID] = append(chapterMap[ch.NovelVolumeID], ch)
	}

	var builder strings.Builder
	builder.WriteString(artifact.Title)
	builder.WriteString("\n\n")
	if artifact.Author != "" {
		builder.WriteString("作者：")
		builder.WriteString(artifact.Author)
		builder.WriteString("\n")
	}
	if artifact.Desc != "" {
		builder.WriteString("\n简介：\n")
		builder.WriteString(artifact.Desc)
		builder.WriteString("\n")
	}
	builder.WriteString("\n\n")

	for _, volume := range volumes {
		builder.WriteString("========================================\n")
		builder.WriteString(volume.Title)
		builder.WriteString("\n========================================\n\n")

		volChapters := chapterMap[volume.ID]
		for _, ch := range volChapters {
			builder.WriteString("【")
			builder.WriteString(ch.Title)
			builder.WriteString("】\n\n")
			builder.WriteString(ch.Content)
			builder.WriteString("\n\n")
		}
	}

	filename := artifact.Title + ".txt"
	c.Header("Content-Type", "text/plain; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+strings.ReplaceAll(filename, " ", "%20"))
	c.String(200, builder.String())
}
