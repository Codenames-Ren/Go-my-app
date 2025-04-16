package controllers

import (
	"log"
	"net/http"

	"ren/backend-api/src/service"

	"github.com/gin-gonic/gin"
)

type OTPController struct {
	OTPService *service.OTPService
	EmailService *service.EmailService
}

//Handle Generate OTP
func (ctrl *OTPController) RequestOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required"`
		Purpose string `json:"purpose" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	go func() {
		_, err := ctrl.OTPService.CreateOTP(req.Email, req.Purpose)
		if err != nil {
			log.Println("Failed to send OTP:", err)
		}
	}()

	//response JSON
	c.JSON(http.StatusOK, gin.H{
		"message": "OTP has been sent to your email.",	
	})
}

func (ctrl *OTPController) VerifyOTP(c *gin.Context) {
	var req struct {
		Email 			string		`json:"email"`
		Purpose 		string		`json:"purpose"`
		Code 			string		`json:"otpCode"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	valid, err := ctrl.OTPService.VerifyOTPByEmail(req.Email, req.Purpose, req.Code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired OTP"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "OTP verified successfully"})
}