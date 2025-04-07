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

