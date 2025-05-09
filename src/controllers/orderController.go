package controllers

import (
	// "fmt"
	"log"
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
			TicketType: 		req.TicketType,
			OrderCount: 		req.OrderCount,
			PaymentTo: 			req.PaymentTo,
		}

		order, ticketPrice, err := service.CreateOrder(db, orderData, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal Menyimpan Order : " + err.Error()})
			return
		}

		// Memanggil struct invoice data dari package service
		invoice := service.InvoiceData{
			Name: 			order.Name,
			TicketType: 	order.TicketType,
			TicketPrice: 	ticketPrice,
			OrderCount: 	order.OrderCount,
			TotalPrice: 	order.TotalPrice,
			PaymentTo: 		order.PaymentTo,
			TicketCode: 	order.TicketCode,
			Now: 			time.Now(),
		}

		if err := invoiceService.SendInvoiceHTML(order.Email, invoice); err != nil {
			log.Println("Gagal Mengirim Invoice", err)
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Order berhasil disimpan dan invoice dikirim",
			"ticket_code": order.TicketCode,
			"order_number": order.OrderNumber,
		})
	}
}

