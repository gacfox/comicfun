package handler

import (
	"comicfun/internal/database"
	"comicfun/internal/model"

	"github.com/gin-gonic/gin"
)

type CreateTagRequest struct {
	Name         string `json:"name" binding:"required"`
	IsCatalog    int    `json:"isCatalog"`
	TagImgURL    string `json:"tagImgUrl"`
	DisplayOrder int    `json:"displayOrder"`
}

type UpdateTagRequest struct {
	Name         string `json:"name"`
	IsCatalog    *int   `json:"isCatalog"`
	TagImgURL    string `json:"tagImgUrl"`
	DisplayOrder *int   `json:"displayOrder"`
}

type TagResponse struct {
	ID           uint   `json:"id"`
	Name         string `json:"name"`
	IsCatalog    int    `json:"isCatalog"`
	TagImgURL    string `json:"tagImgUrl"`
	DisplayOrder int    `json:"displayOrder"`
}

func CreateTag(c *gin.Context) {
	var req CreateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	tag := model.Tag{
		Name:         req.Name,
		IsCatalog:    req.IsCatalog,
		TagImgURL:    req.TagImgURL,
		DisplayOrder: req.DisplayOrder,
	}

	if err := database.DB.Create(&tag).Error; err != nil {
		InternalError(c, "failed to create tag")
		return
	}

	Success(c, toTagResponse(tag))
}

func GetTag(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "tag id is required")
		return
	}

	var tag model.Tag
	if err := database.DB.First(&tag, id).Error; err != nil {
		NotFound(c, "tag not found")
		return
	}

	Success(c, toTagResponse(tag))
}

func UpdateTag(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "tag id is required")
		return
	}

	var tag model.Tag
	if err := database.DB.First(&tag, id).Error; err != nil {
		NotFound(c, "tag not found")
		return
	}

	var req UpdateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	if req.Name != "" {
		tag.Name = req.Name
	}
	if req.IsCatalog != nil {
		tag.IsCatalog = *req.IsCatalog
	}
	if req.TagImgURL != "" {
		tag.TagImgURL = req.TagImgURL
	}
	if req.DisplayOrder != nil {
		tag.DisplayOrder = *req.DisplayOrder
	}

	if err := database.DB.Save(&tag).Error; err != nil {
		InternalError(c, "failed to update tag")
		return
	}

	Success(c, toTagResponse(tag))
}

func DeleteTag(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "tag id is required")
		return
	}

	var tag model.Tag
	if err := database.DB.First(&tag, id).Error; err != nil {
		NotFound(c, "tag not found")
		return
	}

	if err := database.DB.Delete(&tag).Error; err != nil {
		InternalError(c, "failed to delete tag")
		return
	}

	deleteTagImage(&tag)

	Success(c, nil)
}

func ListTags(c *gin.Context) {
	var tags []model.Tag
	if err := database.DB.Order("display_order ASC, id ASC").Find(&tags).Error; err != nil {
		InternalError(c, "failed to query tags")
		return
	}

	items := make([]TagResponse, len(tags))
	for i, t := range tags {
		items[i] = toTagResponse(t)
	}

	Success(c, items)
}

func toTagResponse(tag model.Tag) TagResponse {
	return TagResponse{
		ID:           tag.ID,
		Name:         tag.Name,
		IsCatalog:    tag.IsCatalog,
		TagImgURL:    tag.TagImgURL,
		DisplayOrder: tag.DisplayOrder,
	}
}
