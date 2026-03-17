package handler

import (
	"comicfun/internal/database"
	"comicfun/internal/model"
	"encoding/json"
	"time"

	"github.com/gin-gonic/gin"
)

type HistoryData struct {
	VolumeId  uint  `json:"volumeId"`
	ChapterId uint  `json:"chapterId"`
	Position  int64 `json:"position"`
}

type UpdateHistoryRequest struct {
	ArtifactId uint  `json:"artifactId" binding:"required"`
	VolumeId   uint  `json:"volumeId" binding:"required"`
	ChapterId  uint  `json:"chapterId" binding:"required"`
	Position   int64 `json:"position"`
}

type HistoryItem struct {
	Id           uint      `json:"id"`
	ArtifactId   uint      `json:"artifactId"`
	ContentType  int       `json:"contentType"`
	Title        string    `json:"title"`
	CoverImgUrl  string    `json:"coverImgUrl"`
	VolumeId     uint      `json:"volumeId"`
	ChapterId    uint      `json:"chapterId"`
	ChapterTitle string    `json:"chapterTitle"`
	Position     int64     `json:"position"`
	UpdateTime   time.Time `json:"updateTime"`
}

type HistoryListResponse struct {
	Items []HistoryItem `json:"items"`
	Total int64         `json:"total"`
}

func UpdateHistory(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req UpdateHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	var artifact model.Artifact
	if err := database.DB.First(&artifact, req.ArtifactId).Error; err != nil {
		NotFound(c, "artifact not found")
		return
	}

	historyData := HistoryData{
		VolumeId:  req.VolumeId,
		ChapterId: req.ChapterId,
		Position:  req.Position,
	}
	dataJSON, err := json.Marshal(historyData)
	if err != nil {
		InternalError(c, "failed to marshal history data")
		return
	}

	now := time.Now()

	var history model.History
	result := database.DB.Where("user_id = ? AND artifact_id = ?", userID, req.ArtifactId).First(&history)

	if result.Error == nil {
		history.HistoryData = string(dataJSON)
		history.UpdateTime = now
		if err := database.DB.Save(&history).Error; err != nil {
			InternalError(c, "failed to update history")
			return
		}
	} else {
		history = model.History{
			ArtifactID:  req.ArtifactId,
			UserID:      userID,
			HistoryData: string(dataJSON),
			CreateTime:  now,
			UpdateTime:  now,
		}
		if err := database.DB.Create(&history).Error; err != nil {
			InternalError(c, "failed to create history")
			return
		}
	}

	Success(c, nil)
}

func GetHistory(c *gin.Context) {
	userID := c.GetUint("user_id")
	artifactId := c.Param("artifactId")

	if artifactId == "" {
		BadRequest(c, "artifact id is required")
		return
	}

	var history model.History
	if err := database.DB.Where("user_id = ? AND artifact_id = ?", userID, artifactId).First(&history).Error; err != nil {
		Success(c, nil)
		return
	}

	var historyData HistoryData
	if err := json.Unmarshal([]byte(history.HistoryData), &historyData); err != nil {
		InternalError(c, "failed to parse history data")
		return
	}

	Success(c, gin.H{
		"volumeId":  historyData.VolumeId,
		"chapterId": historyData.ChapterId,
		"position":  historyData.Position,
	})
}

func ListHistory(c *gin.Context) {
	userID := c.GetUint("user_id")

	var histories []model.History
	if err := database.DB.Where("user_id = ?", userID).Order("update_time DESC").Find(&histories).Error; err != nil {
		InternalError(c, "failed to query history")
		return
	}

	var total int64
	database.DB.Model(&model.History{}).Where("user_id = ?", userID).Count(&total)

	items := make([]HistoryItem, 0, len(histories))
	for _, h := range histories {
		var artifact model.Artifact
		if err := database.DB.First(&artifact, h.ArtifactID).Error; err != nil {
			continue
		}

		var historyData HistoryData
		if err := json.Unmarshal([]byte(h.HistoryData), &historyData); err != nil {
			continue
		}

		chapterTitle := ""
		switch artifact.ContentType {
		case 1:
			var chapter model.NovelChapter
			if err := database.DB.Where("id = ?", historyData.ChapterId).First(&chapter).Error; err == nil {
				chapterTitle = chapter.Title
			}
		case 2:
			var chapter model.ComicChapter
			if err := database.DB.Where("id = ?", historyData.ChapterId).First(&chapter).Error; err == nil {
				chapterTitle = chapter.Title
			}
		case 3:
			var chapter model.AnimationChapter
			if err := database.DB.Where("id = ?", historyData.ChapterId).First(&chapter).Error; err == nil {
				chapterTitle = chapter.Title
			}
		}

		items = append(items, HistoryItem{
			Id:           h.ID,
			ArtifactId:   h.ArtifactID,
			ContentType:  artifact.ContentType,
			Title:        artifact.Title,
			CoverImgUrl:  artifact.CoverImgURL,
			VolumeId:     historyData.VolumeId,
			ChapterId:    historyData.ChapterId,
			ChapterTitle: chapterTitle,
			Position:     historyData.Position,
			UpdateTime:   h.UpdateTime,
		})
	}

	Success(c, HistoryListResponse{
		Items: items,
		Total: total,
	})
}

func DeleteHistory(c *gin.Context) {
	userID := c.GetUint("user_id")
	artifactId := c.Param("artifactId")

	if artifactId == "" {
		BadRequest(c, "artifact id is required")
		return
	}

	if err := database.DB.Where("user_id = ? AND artifact_id = ?", userID, artifactId).Delete(&model.History{}).Error; err != nil {
		InternalError(c, "failed to delete history")
		return
	}

	Success(c, nil)
}

func ClearHistory(c *gin.Context) {
	userID := c.GetUint("user_id")

	if err := database.DB.Where("user_id = ?", userID).Delete(&model.History{}).Error; err != nil {
		InternalError(c, "failed to clear history")
		return
	}

	Success(c, nil)
}
