package handler

import (
	"comicfun/internal/auth"
	"comicfun/internal/database"
	"comicfun/internal/model"
	"time"

	"github.com/gin-gonic/gin"
)

type CreateAPIKeyRequest struct {
	Name string `json:"name" binding:"required"`
}

type APIKeyResponse struct {
	ID           uint   `json:"id"`
	Name         string `json:"name"`
	CreateTime   string `json:"create_time"`
	LastUsedTime string `json:"last_used_time,omitempty"`
	Revoked      int    `json:"revoked"`
}

func CreateAPIKey(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req CreateAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	var user model.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		InternalError(c, "user not found")
		return
	}

	apiKey := model.APIKey{
		Name:       req.Name,
		UserID:     userID,
		CreateTime: time.Now(),
	}
	if err := database.DB.Create(&apiKey).Error; err != nil {
		InternalError(c, "failed to create api key")
		return
	}

	token, err := auth.GenerateAPIKeyToken(user.ID, user.Username, user.IsAdmin, apiKey.ID)
	if err != nil {
		InternalError(c, "failed to generate token")
		return
	}

	apiKey.TokenHash = auth.HashToken(token)
	if err := database.DB.Save(&apiKey).Error; err != nil {
		InternalError(c, "failed to save api key")
		return
	}

	Success(c, gin.H{
		"id":    apiKey.ID,
		"name":  apiKey.Name,
		"token": token,
	})
}

func ListAPIKeys(c *gin.Context) {
	userID := c.GetUint("user_id")

	var keys []model.APIKey
	if err := database.DB.Where("user_id = ?", userID).Order("id desc").Find(&keys).Error; err != nil {
		InternalError(c, "failed to list api keys")
		return
	}

	resp := make([]APIKeyResponse, 0, len(keys))
	for _, k := range keys {
		item := APIKeyResponse{
			ID:         k.ID,
			Name:       k.Name,
			CreateTime: FormatDateTime(k.CreateTime),
			Revoked:    k.Revoked,
		}
		if k.LastUsedTime != nil {
			item.LastUsedTime = FormatDateTime(*k.LastUsedTime)
		}
		resp = append(resp, item)
	}
	Success(c, resp)
}

func RevokeAPIKey(c *gin.Context) {
	userID := c.GetUint("user_id")
	id := c.Param("id")

	var apiKey model.APIKey
	if err := database.DB.First(&apiKey, id).Error; err != nil {
		NotFound(c, "api key not found")
		return
	}
	if apiKey.UserID != userID {
		Forbidden(c, "permission denied")
		return
	}

	if err := database.DB.Model(&apiKey).Update("revoked", 1).Error; err != nil {
		InternalError(c, "failed to revoke api key")
		return
	}
	Success(c, nil)
}
