package model

import "time"

type NovelVolume struct {
	ID           uint   `gorm:"primaryKey"`
	Title        string `gorm:"column:title"`
	Desc         string `gorm:"column:desc"`
	DisplayOrder int    `gorm:"column:display_order"`
	ArtifactID   uint   `gorm:"column:artifact_id"`
}

type NovelChapter struct {
	ID            uint      `gorm:"primaryKey"`
	Title         string    `gorm:"column:title"`
	Content       string    `gorm:"column:content"`
	DisplayOrder  int       `gorm:"column:display_order"`
	NovelVolumeID uint      `gorm:"column:novel_volume_id"`
	PublishTime   time.Time `gorm:"column:publish_time"`
}
