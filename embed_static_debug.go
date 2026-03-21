//go:build debug

package comicfun

import "io/fs"

func DistFS() (fs.FS, error) {
	return nil, nil
}
