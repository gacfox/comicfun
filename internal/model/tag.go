package model

type Tag struct {
	ID           uint   `gorm:"primaryKey"`
	Name         string `gorm:"column:name"`
	IsCatalog    int    `gorm:"column:is_catalog"`
	TagImgURL    string `gorm:"column:tag_img_url"`
	DisplayOrder int    `gorm:"column:display_order"`
}
