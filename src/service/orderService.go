package service

import (
	"fmt"
	"ren/backend-api/src/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func GenerateOrderNumber() string {
	date := time.Now().Format("20060102")
	random := uuid.New().String()[:6]
	return fmt.Sprintf("ORD-%s-%s", date, random)
}

func CreateOrder (db *gorm.DB, req models.Order, userID *string) (*models.Order, error) {
	order := models.Order {
		OrderNumber: 		GenerateOrderNumber(),	
		Name: 				req.Name,
		Email: 				req.Email,
		PhoneNumber: 		req.PhoneNumber,
		TicketType: 		req.TicketType,
		OrderCount: 		req.OrderCount,
		PaymentTo: 			req.PaymentTo,
		Status: 			"pending",
		UserID: 			userID,
		TicketCode: 		uuid.New().String()[:8],	
	}

	if err := db.Create(&order).Error; err != nil {
		return nil, err
	}

	return &order, nil
}