package model

const (
	ContentTypeEmpty     = 0
	ContentTypeNovel     = 1
	ContentTypeComic     = 2
	ContentTypeAnimation = 3
)

const (
	AccessLevelPrivate = 0
	AccessLevelFamily  = 1
)

type Artifact struct {
	ID          uint   `gorm:"primaryKey"`
	ContentType int    `gorm:"column:content_type"`
	Title       string `gorm:"column:title"`
	Desc        string `gorm:"column:desc"`
	Author      string `gorm:"column:author"`
	CoverImgURL string `gorm:"column:cover_img_url"`
	IsCompleted int    `gorm:"column:is_completed"`
	UserID      uint   `gorm:"column:user_id"`
	AccessLevel int    `gorm:"column:access_level"`
	PublishTime string `gorm:"column:publish_time"`
	CreateTime  string `gorm:"column:create_time"`
	UpdateTime  string `gorm:"column:update_time"`

	Tags []Tag `gorm:"many2many:artifact_tag;"`
}

type ArtifactTag struct {
	ID         uint `gorm:"primaryKey"`
	ArtifactID uint `gorm:"column:artifact_id"`
	TagID      uint `gorm:"column:tag_id"`
}
