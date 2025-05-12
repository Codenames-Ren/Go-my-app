package controllers

import (
	// "fmt"

	"net/http"
	"ren/backend-api/src/models"
	"ren/backend-api/src/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

//Order Request for bind request body
type OrderRequest struct {
	Name 			string	`json:"name" binding:"required"`	
	Email 			string	`json:"email" binding:"required,email"`	
	PhoneNumber 	string	`json:"phone_number" binding:"required"`
	EventName		string	`json:"event_name" binding:"required"`	
	TicketType	 	string	`json:"ticket_type" binding:"required"`	
	OrderCount 		int		`json:"order_count" binding:"required"`	
	PaymentTo 		string	`json:"payment_to" binding:"required"`	
}

func CreateOrder(db *gorm.DB, invoiceService *service.InvoiceService) gin.HandlerFunc {
	return func (c *gin.Context)  {
		var req OrderRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		//Get user from context JWT
		username, exists := c.Get("username")
		var user models.User
		var userID *string = nil

		if exists {
			if err := db.Where("username = ?", username).First(&user).Error; err == nil {
				userID = &user.ID
			}
		}

		orderData := models.Order{
			Name: 				req.Name,
			Email: 				req.Email,
			PhoneNumber: 		req.PhoneNumber,
			EventName: 			req.EventName,
			TicketType: 		req.TicketType,
			OrderCount: 		req.OrderCount,
			PaymentTo: 			req.PaymentTo,
		}

		order, _, err := service.CreateOrder(db, orderData, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal Menyimpan Order : " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Order berhasil disimpan",
			"order_number": order.OrderNumber,
		})
	}
}

