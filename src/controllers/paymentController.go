package controllers

import (
	// "fmt"

	"net/http"
	"ren/backend-api/src/models"
	"ren/backend-api/src/service"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

//Confirm Order
func PaymentCallback(db *gorm.DB, invoiceService *service.InvoiceService) gin.HandlerFunc {
	return func (c *gin.Context)  {
		var req struct {
			OrderID string `json:"order_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "order_id diperlukan"})
			return
		}

		var order models.Order
		if err := db.First(&order, "id = ?", req.OrderID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order tidak ditemukan"})
			return
		}

		if order.Status == "active" {
			c.JSON(http.StatusOK, gin.H{"message": "Order sudah aktif"})
			return
		}

		order.Status = "active"
		if err := db.Save(&order).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengupdate status"})
			return
		}

		//send invoice again in some condition
		ticketPrice := order.TotalPrice / float64(order.OrderCount)
		invoice := service.InvoiceData{
			Name: 					order.Name,
			TicketType: 			order.TicketType,
			TicketPrice: 			ticketPrice,
			OrderCount: 			order.OrderCount,
			TotalPrice: 			order.TotalPrice,
			PaymentTo: 				order.PaymentTo,
			TicketCode:				order.TicketCode,
			Now:					time.Now(),
		}

		go invoiceService.SendInvoiceHTML(order.Email, invoice)

		c.JSON(http.StatusOK, gin.H{
			"message": "Pembayaran sukses, Invoice telah dikirim ke email anda",
			"status":	order.Status,
		})
	}
}