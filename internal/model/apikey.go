package model

import "time"

type APIKey struct {
	ID           uint       `gorm:"primaryKey"`
	Name         string     `gorm:"column:name"`
	UserID       uint       `gorm:"column:user_id"`
	TokenHash    string     `gorm:"column:token_hash;uniqueIndex"`
	CreateTime   time.Time  `gorm:"column:create_time"`
	LastUsedTime *time.Time `gorm:"column:last_used_time"`
	Revoked      int        `gorm:"column:revoked"`
}
