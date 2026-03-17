package model

const (
	SplitTypeNormal  = 1
	SplitTypeStrip   = 2
)

const (
	ColorTypeBlackWhite = 1
	ColorTypeBluePen    = 2
	ColorTypeRedBlue    = 3
	ColorTypeColor      = 4
)

type ComicVolume struct {
	ID           uint   `gorm:"primaryKey"`
	Title        string `gorm:"column:title"`
	Desc         string `gorm:"column:desc"`
	DisplayOrder int    `gorm:"column:display_order"`
	ArtifactID   uint   `gorm:"column:artifact_id"`
}

type ComicChapter struct {
	ID            uint   `gorm:"primaryKey"`
	Title         string `gorm:"column:title"`
	SplitType     int    `gorm:"column:split_type"`
	ColorType     int    `gorm:"column:color_type"`
	DisplayOrder  int    `gorm:"column:display_order"`
	ComicVolumeID uint   `gorm:"column:comic_volume_id"`
	PublishTime   string `gorm:"column:publish_time"`
}

type ComicPage struct {
	ID             uint   `gorm:"primaryKey"`
	ImageURL       string `gorm:"column:image_url"`
	DisplayOrder   int    `gorm:"column:display_order"`
	ComicChapterID uint   `gorm:"column:comic_chapter_id"`
}
