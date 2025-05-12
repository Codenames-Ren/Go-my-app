package controllers

import (
	"log"
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
		result := db.Where("order_number = ?", req.OrderID).First(&order)
		if result.Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order Tidak Ditemukan"})
			return
		}

		if order.Status == "active" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Order sudah aktif"})
			return
		}

		order.Status = "active"
		if err := db.Save(&order).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengupdate status"})
			return
		}

		
		invoice := service.InvoiceData{
			Name:        order.Name,
			EventName:   order.EventName,
			TicketType:  order.TicketType,
			TicketPrice: order.TicketPrice,
			OrderCount:  order.OrderCount,
			TotalPrice:  order.TotalPrice,
			PaymentTo:   order.PaymentTo,
			TicketCode:  order.TicketCode,
			Now:         time.Now(),
		}

		if err := invoiceService.SendInvoiceHTML(order.Email, invoice); err != nil {
			log.Println("Gagal Mengirim Invoice", err)
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Pembayaran sukses, Invoice telah dikirim ke email anda",
			"status":	order.Status,
		})
	}
}