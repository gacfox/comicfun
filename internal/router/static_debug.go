//go:build debug

package router

import (
	"io/fs"

	"github.com/gin-gonic/gin"
)

type StaticFSProvider func() (fs.FS, error)

func SetupStaticFiles(r *gin.Engine, getFS StaticFSProvider) {
	_ = getFS
}
