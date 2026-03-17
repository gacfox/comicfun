package database

import (
	"comicfun/internal/config"
	"comicfun/internal/model"
	"os"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

var DB *gorm.DB

func Init(cfg *config.Config) error {
	dataPath := cfg.DataPath()
	if err := os.MkdirAll(dataPath, 0755); err != nil {
		return err
	}

	uploadPath := cfg.UploadPath()
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		return err
	}

	dbPath := cfg.DBPath()
	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true,
		},
	})
	if err != nil {
		return err
	}
	return autoMigrate()
}

func autoMigrate() error {
	return DB.AutoMigrate(
		&model.Conf{},
		&model.Tag{},
		&model.Artifact{},
		&model.ArtifactTag{},
		&model.NovelVolume{},
		&model.NovelChapter{},
		&model.ComicVolume{},
		&model.ComicChapter{},
		&model.ComicPage{},
		&model.AnimationVolume{},
		&model.AnimationChapter{},
		&model.User{},
		&model.Bookmark{},
		&model.History{},
		&model.UserArtifactACL{},
	)
}
