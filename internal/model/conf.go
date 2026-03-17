package model

type Conf struct {
	ID        uint   `gorm:"primaryKey"`
	ConfKey   string `gorm:"column:conf_key"`
	ConfValue string `gorm:"column:conf_value"`
}
