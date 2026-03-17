package model

import "time"

type User struct {
	ID              uint      `gorm:"primaryKey"`
	Username        string    `gorm:"column:username"`
	PasswordHash    string    `gorm:"column:password_hash"`
	DisplayUsername string    `gorm:"column:display_username"`
	AvatarURL       string    `gorm:"column:avatar_url"`
	IsAdmin         int       `gorm:"column:is_admin"`
	CreateTime      time.Time `gorm:"column:create_time"`
	UpdateTime      time.Time `gorm:"column:update_time"`
}

type Bookmark struct {
	ID         uint      `gorm:"primaryKey"`
	UserID     uint      `gorm:"column:user_id"`
	ArtifactID uint      `gorm:"column:artifact_id"`
	CreateTime time.Time `gorm:"column:create_time"`
}

type History struct {
	ID          uint      `gorm:"primaryKey"`
	ArtifactID  uint      `gorm:"column:artifact_id;uniqueIndex:idx_user_artifact"`
	UserID      uint      `gorm:"column:user_id;uniqueIndex:idx_user_artifact"`
	HistoryData string    `gorm:"column:history_data"`
	CreateTime  time.Time `gorm:"column:create_time"`
	UpdateTime  time.Time `gorm:"column:update_time"`
}

type UserArtifactACL struct {
	ID         uint `gorm:"primaryKey"`
	ArtifactID uint `gorm:"column:artifact_id"`
	UserID     uint `gorm:"column:user_id"`
}
