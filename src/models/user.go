package models

import (
	"time"

	"gorm.io/gorm"
) 

type User struct {
	ID string `gorm:"primarykey"`
	Username string `gorm:"unique"`
	Email string `gorm:"unique"`
	Password string
	Role string `gorm:"default:user"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt
}