package models

import (
	"time"

	"gorm.io/gorm"
) 

type User struct {
	ID 			string 		`gorm:"primarykey"`
	Username 	string 		`gorm:"unique"`
	Email 		string 		`gorm:"unique"`
	Password 	string
	Role 		string 		`gorm:"default:user"`
	Status		string		`gorm:"default:pending"`
	ResetAllowed bool		`gorm:"default:false"`
	CreatedAt 	time.Time
	UpdatedAt 	time.Time
	DeletedAt 	gorm.DeletedAt `gorm:"index"`
}

type OTP struct {
	ID 				uint	 	`gorm:"primaryKey"`
	UserID 			string 		`gorm:"not null"`
	User 			User 		`gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE"`
	Code 			string 		`gorm:"not null"`
	ExpiresAt 		time.Time 	`gorm:"not null"`
	Purpose 		string		`gorm:"not null"`
	Used			bool		`gorm:"default:false"`
	CreatedAt 		time.Time
}

type Order struct {
	ID 					uint	 	`gorm:"primaryKey"`
	Name 				string 		`gorm:"not null"`
	Email 				string 		`gorm:"not null"`
	PhoneNumber 		string 		`gorm:"not null"`
	EventID		      	string     	`gorm:"not null"`
	Event        		Event      	`gorm:"foreignKey:EventID;references:ID"`
	EventName			string		`gorm:"not null"`
	TicketType 			string 		`gorm:"not null"`
	TicketPrice 		float64 	`gorm:"not null"`
	OrderCount 			int 		`gorm:"not null"`
	PaymentTo 			string 		`gorm:"not null"`
	Status 				string 		`gorm:"default:pending"`
	OrderNumber			string		`gorm:"unique"`
	TicketCode 			string 		`gorm:"unique"`
	TotalPrice 			float64 	`gorm:"not null"`
	UserID 				*string		`gorm:"index"`
	User				*User		`gorm:"foreignKey:UserID;references:ID"`
	CreatedAt 			time.Time
	UpdatedAt 			time.Time
	DeletedAt	 		gorm.DeletedAt `gorm:"index"`
}

type Event struct {
	ID 					string	 	`gorm:"primaryKey"`
	EventName 			string 		`gorm:"not null;unique"`
	IsActive			bool		`gorm:"default:true"`
	EndDate 			time.Time 	`gorm:"not null"`
	CreatedAt 			time.Time
	UpdatedAt 			time.Time
	DeletedAt	 		gorm.DeletedAt `gorm:"index"`
}