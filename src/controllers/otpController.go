package controllers

import (
	"net/http"

	"ren/backend-api/src/service"

	"github.com/gin-gonic/gin"
)

type OTPController struct {
	OTPService *service.OTPService
}

//Handle Generate OTP
func (ctrl *OTPController) RequestOTP(c *gin.Context) {
	var req struct {
		UserID string `json:"user_id" binding:"required"`
		Purpose string `json:"purpose" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	otp, err := ctrl.OTPService.CreateOTP(req.UserID, req.Purpose)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create OTP"})
		return
	}

	//response JSON
	c.JSON(http.StatusOK, gin.H{
		"message": "OTP created successfully!",
		"otp": otp.Code,	
	})
}

func (ctrl *OTPController) VerifyOTP(c *gin.Context) {
	var req struct {
		UserID 			string		`json:"user_id"`
		Purpose 		string		`json:"purpose"`
		Code 			string		`json:"code"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid requset"})
		return
	}

	valid, err := ctrl.OTPService.VerifyOTP(req.UserID, req.Purpose, req.Code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired OTP"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "OTP verified successfully"})
}