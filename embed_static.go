//go:build !debug

package comicfun

import (
	"embed"
	"io/fs"
)

//go:embed frontend/dist
var distFS embed.FS

func DistFS() (fs.FS, error) {
	return fs.Sub(distFS, "frontend/dist")
}
