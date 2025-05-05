package controllers

import (
	"net/http"
	"ren/backend-api/src/models"

	// "ren/backend-api/src/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

//Order Request for bind request body
type OrderRequest struct {
	Name 			string	`json:"name" binding:"required"`	
	Email 			string	`json:"email" binding:"required,email"`	
	PhoneNumber 	string	`json:"phone_number" binding:"required"`	
	TicketType	 	string	`json:"ticket_type" binding:"required"`	
	OrderCount 		int		`json:"order_count" binding:"required"`	
	PaymentTo 		string	`json:"payment_to" binding:"required"`	
}

func CreateOrder(db *gorm.DB) gin.HandlerFunc {
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

		//Generate code Ticket
		ticketCode := uuid.New().String()[:8]

		//Make Struct Order
		order := models.Order{
			Name: 				req.Name,
			Email: 				req.Email,
			PhoneNumber: 		req.PhoneNumber,
			TicketType: 		req.TicketType,
			OrderCount: 		req.OrderCount,
			PaymentTo: 			req.PaymentTo,
			Status: 			"pending",
			UserID: 			userID,
			TicketCode: 		ticketCode,	
		}

		if err := db.Create(&order).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan order: " + err.Error()})
			return
		}

		// //Invoice via Email
		// if err := service.SendInvoiceEmail(req.Email, req.Name, req.TicketType, req.OrderCount, req.PaymentTo, ticketCode); err != nil {
		// 	c.JSON(http.StatusOK, gin.H{
		// 		"message":     "Order berhasil disimpan tetapi gagal mengirim invoice",
		// 		"ticket_code": ticketCode,
		// 		"error":       err.Error(),
		// 	})
		// 	return
		// }

		c.JSON(http.StatusOK, gin.H{
			"message": "Order berhasil disimpan dan invoice dikirim",
			"ticket_code": ticketCode,
		})
	}
}