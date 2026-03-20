package model

import "time"

type AnimationVolume struct {
	ID           uint   `gorm:"primaryKey"`
	Title        string `gorm:"column:title"`
	Desc         string `gorm:"column:desc"`
	DisplayOrder int    `gorm:"column:display_order"`
	ArtifactID   uint   `gorm:"column:artifact_id"`
}

type AnimationChapter struct {
	ID                uint      `gorm:"primaryKey"`
	Title             string    `gorm:"column:title"`
	VideoURL          string    `gorm:"column:video_url"`
	DisplayOrder      int       `gorm:"column:display_order"`
	AnimationVolumeID uint      `gorm:"column:animation_volume_id"`
	PublishTime       time.Time `gorm:"column:publish_time"`
}
