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

func CreateOrder (db *gorm.DB, req models.Order, userID *string) (*models.Order, float64, error) {

	var event models.Event
	if err := db.First(&event, "id = ?", req.EventID).Error; err != nil {
		return nil, 0, fmt.Errorf("event not found")
	}

	//ticket Price
	var ticketPrice float64
	switch req.TicketType {
	case "Ekonomi":
		ticketPrice = 27000000
	case "Reguler":
		ticketPrice = 30000000
	case "VIP":
		ticketPrice = 35000000
	default:
		return nil, 0, fmt.Errorf("tipe tiket tidak valid")
	}

	totalPrice := ticketPrice * float64(req.OrderCount)


	order := models.Order {
		OrderNumber: 		GenerateOrderNumber(),	
		Name: 				req.Name,
		Email: 				req.Email,
		PhoneNumber: 		req.PhoneNumber,
		EventID:		 	event.ID,
		EventName: 			event.EventName,
		TicketType: 		req.TicketType,
		TicketPrice: 		ticketPrice,
		OrderCount: 		req.OrderCount,
		PaymentTo: 			req.PaymentTo,
		TotalPrice:  		totalPrice,
		Status: 			"pending",
		UserID: 			userID,
		TicketCode: 		uuid.New().String()[:8],	
	}

	if err := db.Create(&order).Error; err != nil {
		return nil, 0, err
	}

	return &order, ticketPrice, nil
}