package main

import (
	"comicfun"
	"comicfun/internal/config"
	"comicfun/internal/database"
	"comicfun/internal/router"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	if err := database.Init(cfg); err != nil {
		log.Fatal(err)
	}

	r := gin.Default()
	r.Static("/uploads", cfg.UploadPath())
	router.Setup(r)
	router.SetupStaticFiles(r, comicfun.DistFS)
	r.Run(cfg.ServerAddr())
}
