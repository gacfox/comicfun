package handler

import (
	"comicfun/internal/auth"
	"comicfun/internal/database"
	"comicfun/internal/model"
	"math/rand"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type InitRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginData struct {
	Token string   `json:"token"`
	User  UserData `json:"user"`
}

type UserData struct {
	ID              uint   `json:"id"`
	Username        string `json:"username"`
	DisplayUsername string `json:"displayUsername"`
	AvatarURL       string `json:"avatarUrl"`
	IsAdmin         int    `json:"isAdmin"`
}

type CreateUserRequest struct {
	Username        string `json:"username" binding:"required"`
	DisplayUsername string `json:"displayUsername"`
	IsAdmin         int    `json:"isAdmin"`
}

type CreateUserResponse struct {
	User     UserData `json:"user"`
	Password string   `json:"password"`
}

type UpdateUserRequest struct {
	DisplayUsername string `json:"displayUsername"`
	IsAdmin         *int   `json:"isAdmin"`
}

type ListUsersResponse struct {
	Items []UserData `json:"items"`
	Total int64      `json:"total"`
}

func Init(c *gin.Context) {
	var count int64
	database.DB.Model(&model.User{}).Count(&count)
	if count > 0 {
		BadRequest(c, "system already initialized")
		return
	}

	var req InitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, err.Error())
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		InternalError(c, "failed to hash password")
		return
	}

	user := model.User{
		Username:        req.Username,
		PasswordHash:    string(hashedPassword),
		DisplayUsername: req.Username,
		IsAdmin:         1,
		CreateTime:      time.Now(),
		UpdateTime:      time.Now(),
	}

	if err := database.DB.Create(&user).Error; err != nil {
		InternalError(c, "failed to create user")
		return
	}

	conf := model.Conf{
		ConfKey:   ConfKeySystemInitialized,
		ConfValue: "1",
	}
	if err := database.DB.Create(&conf).Error; err != nil {
		InternalError(c, "failed to set system initialized flag")
		return
	}

	Success(c, toUserData(user))
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, err.Error())
		return
	}

	var user model.User
	if err := database.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			Unauthorized(c, "invalid credentials")
			return
		}
		InternalError(c, "database error")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		Unauthorized(c, "invalid credentials")
		return
	}

	token, err := auth.GenerateToken(user.ID, user.Username, user.IsAdmin)
	if err != nil {
		InternalError(c, "failed to generate token")
		return
	}

	Success(c, LoginData{
		Token: token,
		User:  toUserData(user),
	})
}

func GetMe(c *gin.Context) {
	userID := c.GetUint("user_id")

	var user model.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		NotFound(c, "user not found")
		return
	}

	Success(c, toUserData(user))
}

type UpdateProfileRequest struct {
	DisplayUsername string `json:"displayUsername"`
	AvatarURL       string `json:"avatarUrl"`
}

type UpdatePasswordRequest struct {
	OldPassword string `json:"oldPassword" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=6"`
}

func UpdateProfile(c *gin.Context) {
	userID := c.GetUint("user_id")

	var user model.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		NotFound(c, "user not found")
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	if req.AvatarURL != user.AvatarURL && user.AvatarURL != "" {
		deleteAvatar(&user)
	}

	user.DisplayUsername = req.DisplayUsername
	user.AvatarURL = req.AvatarURL
	user.UpdateTime = time.Now()

	if err := database.DB.Save(&user).Error; err != nil {
		InternalError(c, "failed to update profile")
		return
	}

	Success(c, toUserData(user))
}

func UpdatePassword(c *gin.Context) {
	userID := c.GetUint("user_id")

	var user model.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		NotFound(c, "user not found")
		return
	}

	var req UpdatePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		BadRequest(c, "incorrect old password")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		InternalError(c, "failed to hash password")
		return
	}

	user.PasswordHash = string(hashedPassword)
	user.UpdateTime = time.Now()

	if err := database.DB.Save(&user).Error; err != nil {
		InternalError(c, "failed to update password")
		return
	}

	Success(c, nil)
}

func toUserData(user model.User) UserData {
	return UserData{
		ID:              user.ID,
		Username:        user.Username,
		DisplayUsername: user.DisplayUsername,
		AvatarURL:       user.AvatarURL,
		IsAdmin:         user.IsAdmin,
	}
}

func ListUsers(c *gin.Context) {
	var users []model.User
	if err := database.DB.Order("id ASC").Find(&users).Error; err != nil {
		InternalError(c, "failed to query users")
		return
	}

	var total int64
	database.DB.Model(&model.User{}).Count(&total)

	items := make([]UserData, len(users))
	for i, u := range users {
		items[i] = toUserData(u)
	}

	Success(c, ListUsersResponse{
		Items: items,
		Total: total,
	})
}

func CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	var count int64
	database.DB.Model(&model.User{}).Where("username = ?", req.Username).Count(&count)
	if count > 0 {
		BadRequest(c, "username already exists")
		return
	}

	password := generateRandomPassword()
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		InternalError(c, "failed to hash password")
		return
	}

	displayUsername := req.DisplayUsername
	if displayUsername == "" {
		displayUsername = req.Username
	}

	user := model.User{
		Username:        req.Username,
		PasswordHash:    string(hashedPassword),
		DisplayUsername: displayUsername,
		IsAdmin:         req.IsAdmin,
		CreateTime:      time.Now(),
		UpdateTime:      time.Now(),
	}

	if err := database.DB.Create(&user).Error; err != nil {
		InternalError(c, "failed to create user")
		return
	}

	Success(c, CreateUserResponse{
		User:     toUserData(user),
		Password: password,
	})
}

func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "user id is required")
		return
	}

	var user model.User
	if err := database.DB.First(&user, id).Error; err != nil {
		NotFound(c, "user not found")
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body")
		return
	}

	if req.DisplayUsername != "" {
		user.DisplayUsername = req.DisplayUsername
	}
	if req.IsAdmin != nil {
		user.IsAdmin = *req.IsAdmin
	}
	user.UpdateTime = time.Now()

	if err := database.DB.Save(&user).Error; err != nil {
		InternalError(c, "failed to update user")
		return
	}

	Success(c, toUserData(user))
}

func DeleteUser(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "user id is required")
		return
	}

	var user model.User
	if err := database.DB.First(&user, id).Error; err != nil {
		NotFound(c, "user not found")
		return
	}

	if user.IsAdmin == 1 {
		var adminCount int64
		database.DB.Model(&model.User{}).Where("is_admin = 1").Count(&adminCount)
		if adminCount <= 1 {
			BadRequest(c, "cannot delete the last admin user")
			return
		}
	}

	if err := database.DB.Delete(&user).Error; err != nil {
		InternalError(c, "failed to delete user")
		return
	}

	Success(c, nil)
}

type ResetPasswordResponse struct {
	Password string `json:"password"`
}

func ResetPassword(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "user id is required")
		return
	}

	var user model.User
	if err := database.DB.First(&user, id).Error; err != nil {
		NotFound(c, "user not found")
		return
	}

	password := generateRandomPassword()
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		InternalError(c, "failed to hash password")
		return
	}

	user.PasswordHash = string(hashedPassword)
	user.UpdateTime = time.Now()

	if err := database.DB.Save(&user).Error; err != nil {
		InternalError(c, "failed to reset password")
		return
	}

	Success(c, ResetPasswordResponse{Password: password})
}

func generateRandomPassword() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const length = 8

	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[r.Intn(len(charset))]
	}
	return string(b)
}
