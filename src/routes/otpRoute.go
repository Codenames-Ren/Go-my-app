package routes

import (
	"os"
	"ren/backend-api/src/controllers"
	"ren/backend-api/src/service"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterOTPRoutes(r *gin.Engine, db *gorm.DB) {
	//convert smtp port dari string ke int
	smtpPort, _ := strconv.Atoi(os.Getenv("SMTP_PORT"))

	
	emailService := &service.EmailService{
		SMTPHost: os.Getenv("SMTP_HOST"),
		SMTPPort: smtpPort,
		Username: os.Getenv("SMTP_USERNAME"),
		Password: os.Getenv("SMTP_PASSWORD"),
	}
	otpService := &service.OTPService{
		DB: db,
		EmailService: emailService,
	}

	otpController := &controllers.OTPController{
		OTPService: otpService,
		EmailService: emailService,
	}

	otp := r.Group("/otp")
	{
		otp.POST("/request", otpController.RequestOTP)
		otp.POST("/verify", otpController.VerifyOTP)
	}
}