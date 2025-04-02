package routes

import (
	"ren/backend-api/controllers"
	"ren/backend-api/middlewares"

	"github.com/gin-gonic/gin"
)

func UserRoutes(router *gin.Engine) {
	userGroup := router.Group("/users")
	{
		userGroup.POST("/register", controllers.Register)
		userGroup.GET("/profile", middlewares.AuthMiddleware(), func(c *gin.Context) {
			c.JSON(200, gin.H{"message": "Welcome to your profile!"})
		})
	}
}