package handler

import (
	"time"

	"github.com/gin-gonic/gin"
)

type HealthData struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
}

func Health(c *gin.Context) {
	Success(c, HealthData{
		Status:    "ok",
		Timestamp: time.Now().Format(time.RFC3339),
	})
}