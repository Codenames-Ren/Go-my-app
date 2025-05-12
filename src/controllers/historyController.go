package controllers

import (
	"fmt"
	"net/http"
	"ren/backend-api/src/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type HistoryResponse struct {

	Name         string  `json:"name"`
	Email        string  `json:"email"`
	Event        string  `json:"event"`
	Date         string  `json:"date"`
	TicketCount  string  `json:"ticket_count"`
	Cost         float64 `json:"cost"`
	PaymentTo	 string  `json:"payment_to"`
	Status       string  `json:"status"`
	OrderNumber  string  `json:"order_number"`
}

func GetOrderHistoryHandler(db *gorm.DB) gin.HandlerFunc {
	return func (c *gin.Context)  {
		username, exists := c.Get("username")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		usernameStr := fmt.Sprintf("%v", username)

		var user models.User
		if err := db.Where("username = ?", usernameStr).First(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user data:" + err.Error()})
			return
		}

		fmt.Println("Found user with id:", user.ID)

		var orders []models.Order
		if err := db.Where("user_id = ?", user.ID).Order("created_at DESC").Find(&orders).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders:" + err.Error()})
			return
		}

		fmt.Println("found orders count:", len(orders))

		var response []HistoryResponse
		for _, order := range orders {
			response = append(response, HistoryResponse{
				Name: 					order.Name,
				Email: 					order.Email,
				Event: 					order.EventName,
				Date:					order.CreatedAt.Format("2006-01-02"),
				TicketCount: 			fmt.Sprintf("%d", order.OrderCount),
				Cost: 					order.TotalPrice,
				PaymentTo: 				order.PaymentTo,
				Status: 				order.Status,
				OrderNumber: 			order.OrderNumber,
			})	
		}
		c.JSON(http.StatusOK, gin.H{"orders": response})
	}
}