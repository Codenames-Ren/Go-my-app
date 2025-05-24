package controllers

import (
	"net/http"
	"ren/backend-api/src/models"
	"ren/backend-api/src/service"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

//Order Request for bind request body
type OrderRequest struct {
	Name 			string	`json:"name" binding:"required"`	
	Email 			string	`json:"email" binding:"required,email"`	
	PhoneNumber 	string	`json:"phone_number" binding:"required"`
	EventID			string	`json:"event_id" binding:"required"`	
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

		//Validate event id
		var event models.Event
		if err := db.First(&event, "id = ?", req.EventID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Event not found"})
			return
		}

		if !event.IsActive {
			c.JSON(http.StatusBadRequest, gin.H{"error": "event is not active"})
			return
		}

		if event.EndDate.Before(time.Now()) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "event has ended"})
			return
		}

		orderData := models.Order{
			Name: 				req.Name,
			Email: 				req.Email,
			PhoneNumber: 		req.PhoneNumber,
			EventName: 			event.EventName,
			EventID: 			event.ID,
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

func GetAllOrders(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var orders []models.Order

		status := c.Query("status")
		date := c.Query("date")

		query := db.Model(&models.Order{})

		if status != "" {
			query = query.Where("status = ?", status)
		}

		if date != "" {
			if parseDate, err := time.Parse("2006-01-02", date); err == nil {
				query = query.Where("DATE(created_at) = ?", parseDate.Format("2006-01-02"))
			} else {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (user YYYY-MM-DD)"})
				return
			}
		}

		if err := query.Order("created_at desc").Find(&orders).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get order"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"orders": orders})
	}
}
