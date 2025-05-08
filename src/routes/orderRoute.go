package routes

import (
	"ren/backend-api/src/controllers"
	"ren/backend-api/src/middlewares"
	"ren/backend-api/src/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func OrderRoutes(router *gin.Engine, db *gorm.DB, emailService *service.EmailService) {
	invoiceService := &service.InvoiceService{
		EmailService: emailService,
	}

	//user order
	userOrder := router.Group("/orders", middlewares.AuthMiddleware())
	{
		userOrder.POST("/", controllers.CreateOrder(db, invoiceService))
		// userOrder.POST("/payment/callback", controllers.PaymentCallback(db, invoiceService))
	}

	//Admin access
	// adminOrder := router.Group("/admin/orders", middlewares.AuthMiddleware(), middlewares.AdminMiddleware())
	// {
	// 	// adminOrder.GET("/", controllers.GetAllOrders(db))
	// }

	// //superadmin
	// superOrder := router.Group("/sp-admin/orders", middlewares.AuthMiddleware(), middlewares.SuperAdminMiddleware())
	// {
	// 	superOrder.DELETE("/:id", controllers.DeleteOrder(db))
	// }
}