package helper

import "github.com/gin-gonic/gin"

const (
	AccessLevelPrivate = 0
	AccessLevelFamily  = 1
)

func CheckAccess(accessLevel int, userID uint, isAdmin int, authorizedUserIDs []uint) bool {
	if isAdmin == 1 {
		return true
	}

	if accessLevel >= AccessLevelFamily {
		return true
	}

	for _, authorizedID := range authorizedUserIDs {
		if userID == authorizedID {
			return true
		}
	}

	return false
}

func GetAuthorizedArtifactIDs(userID uint) []uint {
	return nil
}

func ApplyAccessFilter(query interface{}, userID uint, isAdmin int) interface{} {
	if isAdmin == 1 {
		return query
	}

	return nil
}

func GetUserID(c *gin.Context) uint {
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(uint); ok {
			return id
		}
	}
	return 0
}

func GetIsAdmin(c *gin.Context) int {
	if isAdmin, exists := c.Get("is_admin"); exists {
		if admin, ok := isAdmin.(int); ok {
			return admin
		}
	}
	return 0
}
