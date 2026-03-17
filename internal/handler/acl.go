package handler

import (
	"comicfun/internal/database"
	"comicfun/internal/helper"
	"comicfun/internal/model"
	"time"

	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ACLUserData struct {
	ID              uint      `json:"id"`
	Username        string    `json:"username"`
	DisplayUsername string    `json:"displayUsername"`
	AvatarURL       string    `json:"avatarUrl"`
	IsAdmin         int       `json:"isAdmin"`
	CreateTime      time.Time `json:"createTime"`
}

func toACLUserData(user model.User) ACLUserData {
	return ACLUserData{
		ID:              user.ID,
		Username:        user.Username,
		DisplayUsername: user.DisplayUsername,
		AvatarURL:       user.AvatarURL,
		IsAdmin:         user.IsAdmin,
		CreateTime:      user.CreateTime,
	}
}

func GetArtifactACL(c *gin.Context) {
	artifactIDStr := c.Param("artifact_id")
	artifactID, err := strconv.ParseUint(artifactIDStr, 10, 32)
	if err != nil {
		Error(c, http.StatusBadRequest, "invalid artifact id")
		return
	}

	var artifact model.Artifact
	if err := database.DB.First(&artifact, artifactID).Error; err != nil {
		Error(c, http.StatusNotFound, "artifact not found")
		return
	}

	var userACLs []model.UserArtifactACL
	if err := database.DB.Where("artifact_id = ?", artifactID).Find(&userACLs).Error; err != nil {
		Error(c, http.StatusInternalServerError, "failed to fetch acl")
		return
	}

	userIDs := make([]uint, len(userACLs))
	for i, acl := range userACLs {
		userIDs[i] = acl.UserID
	}

	var users []model.User
	if err := database.DB.Where("id IN ? AND is_admin = 0", userIDs).Find(&users).Error; err != nil {
		Error(c, http.StatusInternalServerError, "failed to fetch users")
		return
	}

	aclUsers := make([]ACLUserData, len(users))
	for i, u := range users {
		aclUsers[i] = toACLUserData(u)
	}

	Success(c, gin.H{
		"users": aclUsers,
	})
}

func UpdateArtifactACL(c *gin.Context) {
	artifactIDStr := c.Param("artifact_id")
	artifactID, err := strconv.ParseUint(artifactIDStr, 10, 32)
	if err != nil {
		Error(c, http.StatusBadRequest, "invalid artifact id")
		return
	}

	var req struct {
		UserIDs []uint `json:"user_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Error(c, http.StatusBadRequest, "invalid request")
		return
	}

	var artifact model.Artifact
	if err := database.DB.First(&artifact, artifactID).Error; err != nil {
		Error(c, http.StatusNotFound, "artifact not found")
		return
	}

	if artifact.AccessLevel != helper.AccessLevelPrivate {
		Error(c, http.StatusBadRequest, "only private artifacts can have acl")
		return
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("artifact_id = ?", artifactID).Delete(&model.UserArtifactACL{}).Error; err != nil {
			return err
		}

		for _, userID := range req.UserIDs {
			acl := model.UserArtifactACL{
				ArtifactID: uint(artifactID),
				UserID:     userID,
			}
			if err := tx.Create(&acl).Error; err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		Error(c, http.StatusInternalServerError, "failed to update acl")
		return
	}

	Success(c, nil)
}

func GetRegularUsers(c *gin.Context) {
	var users []model.User
	if err := database.DB.Where("is_admin = 0").Find(&users).Error; err != nil {
		Error(c, http.StatusInternalServerError, "failed to fetch users")
		return
	}

	aclUsers := make([]ACLUserData, len(users))
	for i, u := range users {
		aclUsers[i] = toACLUserData(u)
	}

	Success(c, gin.H{
		"users": aclUsers,
	})
}
