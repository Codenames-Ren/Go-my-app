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
		userGroup.POST("/login", controllers.Login)
		userGroup.PUT("/update-password", middlewares.AuthMiddleware(), controllers.UpdatePassword)

		userGroup.Use(middlewares.AuthMiddleware())
		{
		userGroup.GET("/profile", middlewares.AuthMiddleware(), func(c *gin.Context) {
				c.JSON(200, gin.H{"message": "Welcome to your profile!"})
			})
		}
	}

	//route group admin
	adminGroup := router.Group("/admin", middlewares.AuthMiddleware(), middlewares.AdminMiddleware())
	{
		adminGroup.GET("/dashboard", func(c *gin.Context) {
			username, _ := c.Get("username")
			c.JSON(200, gin.H{
				"message": "Welcome Admin!",
				"admin" : username,
			})
		})

		//nambah endpoint buat grup admin disini
		adminGroup.GET("/users", controllers.GetAllUsers)
	}
}