package routes

import (
	"ren/backend-api/src/controllers"
	"ren/backend-api/src/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterOTPRoutes(r *gin.Engine, db *gorm.DB) {
	otpService := &service.OTPService{DB: db}
	otpController := &controllers.OTPController{OTPService: otpService}

	otp := r.Group("/otp")
	{
		otp.POST("/request", otpController.RequestOTP)
		otp.POST("/verify", otpController.VerifyOTP)
	}
}