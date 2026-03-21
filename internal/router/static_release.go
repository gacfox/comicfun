//go:build !debug

package router

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type StaticFSProvider func() (fs.FS, error)

func SetupStaticFiles(r *gin.Engine, getFS StaticFSProvider) {
	staticFS, err := getFS()
	if err != nil {
		panic(err)
	}

	httpFS := http.FS(staticFS)
	fileServer := http.FileServer(httpFS)

	r.GET("/assets/*filepath", gin.WrapH(fileServer))
	r.GET("/favicon.ico", gin.WrapH(fileServer))

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/uploads/") {
			c.JSON(404, gin.H{"code": 1, "message": "not found"})
			return
		}

		file, err := staticFS.Open(strings.TrimPrefix(path, "/"))
		if err == nil {
			file.Close()
			fileServer.ServeHTTP(c.Writer, c.Request)
			return
		}

		c.Header("Content-Type", "text/html; charset=utf-8")
		content, err := fs.ReadFile(staticFS, "index.html")
		if err != nil {
			c.String(500, "Failed to load index.html")
			return
		}
		c.Data(200, "text/html; charset=utf-8", content)
	})
}
