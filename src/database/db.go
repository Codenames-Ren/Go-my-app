package database

import (
	"fmt"
	"log"

	"ren/backend-api/src/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	dsn := "host=localhost user=postgres password=945313 dbname=my-app port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	db.AutoMigrate(&models.User{}, &models.OTP{})

	DB = db
	fmt.Println("Database connected successfully!")
}