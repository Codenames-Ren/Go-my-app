package models

import "gorm.io/gorm" 

type User struct {
	gorm.Model
	Username string `gorm:"unique"`
	Email string `gorm:"unique"`
	Password string
	Role string `gorm:"default:user"`
}