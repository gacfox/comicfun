package handler

import (
	"comicfun/internal/database"
	"comicfun/internal/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const ConfKeySystemInitialized = "system_initialized"

func CheckSystemInitialized(c *gin.Context) {
	var conf model.Conf
	err := database.DB.Where("conf_key = ?", ConfKeySystemInitialized).First(&conf).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			Success(c, gin.H{"initialized": false})
			return
		}
		InternalError(c, "database error")
		return
	}
	Success(c, gin.H{"initialized": conf.ConfValue == "1"})
}

type StatisticsResponse struct {
	NovelCount    int64 `json:"novelCount"`
	ComicCount    int64 `json:"comicCount"`
	AnimationCount int64 `json:"animationCount"`
	UserCount     int64 `json:"userCount"`
}

func GetStatistics(c *gin.Context) {
	var stats StatisticsResponse

	database.DB.Model(&model.Artifact{}).Where("content_type = ?", model.ContentTypeNovel).Count(&stats.NovelCount)
	database.DB.Model(&model.Artifact{}).Where("content_type = ?", model.ContentTypeComic).Count(&stats.ComicCount)
	database.DB.Model(&model.Artifact{}).Where("content_type = ?", model.ContentTypeAnimation).Count(&stats.AnimationCount)
	database.DB.Model(&model.User{}).Count(&stats.UserCount)

	Success(c, stats)
}
