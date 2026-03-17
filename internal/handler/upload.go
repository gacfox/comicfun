package handler

import (
	"comicfun/internal/database"
	"comicfun/internal/model"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

var allowedExtensions = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".webp": true,
	".svg":  true,
	".ico":  true,
	".bmp":  true,
}

var allowedVideoExtensions = map[string]bool{
	".mp4":  true,
	".webm": true,
	".mkv":  true,
	".avi":  true,
	".mov":  true,
	".wmv":  true,
	".flv":  true,
	".m4v":  true,
}

type UploadResponse struct {
	URL string `json:"url"`
}

func UploadTagImage(c *gin.Context) {
	uploadImage(c, "tags")
}

func UploadAvatar(c *gin.Context) {
	uploadImage(c, "avatars")
}

func UploadCover(c *gin.Context) {
	uploadImage(c, "covers")
}

func UploadComicPage(c *gin.Context) {
	artifactId := c.Param("artifactId")
	volumeId := c.Param("volumeId")
	chapterId := c.Param("chapterId")

	file, err := c.FormFile("file")
	if err != nil {
		BadRequest(c, "no file uploaded")
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedExtensions[ext] {
		BadRequest(c, "unsupported file format")
		return
	}

	uploadPath := filepath.Join("data", "uploads", "comic", artifactId, volumeId, chapterId)
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		InternalError(c, "failed to create upload directory")
		return
	}

	filename := uuid.New().String() + ext
	filePath := filepath.Join(uploadPath, filename)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		InternalError(c, "failed to save file")
		return
	}

	Success(c, UploadResponse{URL: "/uploads/comic/" + artifactId + "/" + volumeId + "/" + chapterId + "/" + filename})
}

func UploadVideo(c *gin.Context) {
	artifactId := c.Param("artifactId")
	volumeId := c.Param("volumeId")
	chapterId := c.Param("chapterId")

	file, err := c.FormFile("file")
	if err != nil {
		BadRequest(c, "no file uploaded")
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedVideoExtensions[ext] {
		BadRequest(c, "unsupported video format")
		return
	}

	uploadPath := filepath.Join("data", "uploads", "animation", artifactId, volumeId, chapterId)
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		InternalError(c, "failed to create upload directory")
		return
	}

	filename := uuid.New().String() + ext
	filePath := filepath.Join(uploadPath, filename)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		InternalError(c, "failed to save file")
		return
	}

	Success(c, UploadResponse{URL: "/uploads/animation/" + artifactId + "/" + volumeId + "/" + chapterId + "/" + filename})
}

func uploadImage(c *gin.Context, subDir string) {
	file, err := c.FormFile("file")
	if err != nil {
		BadRequest(c, "no file uploaded")
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedExtensions[ext] {
		BadRequest(c, "unsupported file format")
		return
	}

	uploadPath := filepath.Join("data", "uploads", subDir)
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		InternalError(c, "failed to create upload directory")
		return
	}

	filename := uuid.New().String() + ext
	filePath := filepath.Join(uploadPath, filename)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		InternalError(c, "failed to save file")
		return
	}

	Success(c, UploadResponse{URL: "/uploads/" + subDir + "/" + filename})
}

func deleteImage(imageURL string) {
	if imageURL == "" || !strings.HasPrefix(imageURL, "/uploads/") {
		return
	}
	fullPath := filepath.Join("data", imageURL)
	os.Remove(fullPath)
	removeEmptyDirs(fullPath)
}

func deleteFile(imageURL string) {
	if imageURL == "" || !strings.HasPrefix(imageURL, "/uploads/") {
		return
	}
	fullPath := filepath.Join("data", imageURL)
	os.Remove(fullPath)
	removeEmptyDirs(fullPath)
}

func removeEmptyDirs(filePath string) {
	dir := filepath.Dir(filePath)
	for {
		if dir == "data" || dir == "." || dir == "" {
			break
		}
		entries, err := os.ReadDir(dir)
		if err != nil || len(entries) > 0 {
			break
		}
		parentDir := filepath.Dir(dir)
		os.Remove(dir)
		dir = parentDir
	}
}

func deleteTagImage(tag *model.Tag) {
	if tag.TagImgURL != "" {
		deleteImage(tag.TagImgURL)
	}
}

func deleteAvatar(user *model.User) {
	if user.AvatarURL != "" {
		deleteImage(user.AvatarURL)
	}
}

func deleteComicPageImage(imageURL string) {
	deleteFile(imageURL)
}

func deleteAnimationVideo(videoURL string) {
	deleteFile(videoURL)
}

func init() {
	_ = database.DB
	_ = strconv.Itoa(0)
}

