package routes

import (
	"ren/backend-api/src/controllers"
	"ren/backend-api/src/middlewares"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func EventRoute(router *gin.Engine, db *gorm.DB){
	adminEvent := router.Group("/admin/event", middlewares.AuthMiddleware(), middlewares.AdminMiddleware())
	{
		adminEvent.GET("/", controllers.GetAllEvent(db))
		adminEvent.POST("/", controllers.CreateEvent(db))
		adminEvent.PUT("/:id", controllers.UpdateEvent(db))
		adminEvent.PUT("/:id/toggle-status", controllers.ToggleEventStatus(db))
		adminEvent.DELETE("/:id", controllers.DeleteEvent(db))
	}
}