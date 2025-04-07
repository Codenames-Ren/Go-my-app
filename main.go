package main

import (
	"log"
	"os"
	"ren/backend-api/src/database"
	"ren/backend-api/src/models"
	"ren/backend-api/src/routes"
	"ren/backend-api/src/service"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	//Koneksi ke Database
	database.ConnectDB()

	//automigrate
	database.DB.AutoMigrate(
		&models.User{},
		&models.OTP{},
	)

	//Inisialisasi Server
	router := gin.Default()

	//setup email service
	smtpPort, _ := strconv.Atoi(os.Getenv("SMTP_PORT"))
	emailService := service.EmailService{
		SMTPHost: os.Getenv("SMTP_HOST"),
		SMTPPort: smtpPort,
		Username: os.Getenv("SMTP_USERNAME"),
		Password: os.Getenv("SMTP_PASSWORD"),
	}

	//setup otp service
	otpService := &service.OTPService{
		DB: database.DB,
		EmailService: &emailService,
	}

	//Setup Routing
	routes.UserRoutes(router, database.DB, otpService, &emailService)

	//Server berjalan di port 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	router.Run(":" + port)
}