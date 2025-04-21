package controllers

import (
	"log"
	"net/http"
	"ren/backend-api/src/database"
	"ren/backend-api/src/helper"
	"ren/backend-api/src/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

//forgot password
func ForgotPassword(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	//search user by email
	var user models.User
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "If your email is registered, you will received an OTP"})
		return
	}

	//Send otp for reset password
	_, err := otpService.CreateOTP(user.Email, "reset_password")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H {"error": "Failed to generate OTP"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "OTP has been sent to your email. Please use it to reset your password",
		"user_id": user.ID,
	})
}

func ResetPassword(c *gin.Context) {
	var input struct {
		Email					string `json:"email" binding:"required"`
		Newpassword				string `json:"new_password" binding:"required"`
		ConfirmPassword			string `json:"confirm_password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	//Validate new Password
	if input.Newpassword != input.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "New password and confirm password doesnt match!"})
		return
	}

	//Validate password strength
	if valid, message := helper.ValidatePassword(input.Newpassword); !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": message})
		return
	}

	//search user by email
	var user models.User
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H {"error": "User not found"})
		return
	}

	// //otp verif
	if !user.ResetAllowed {
		c.JSON(http.StatusUnauthorized, gin.H {"error": "You must verify OTP before resetting password"})
		return
	}

	//hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Newpassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Update password & reset ResetAllowed to false
	if err := database.DB.Model(&user).Updates(map[string]interface{}{
		"password":      string(hashedPassword),
		"reset_allowed": false,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	//cleanup OTP afterr password reset success
	if err := otpService.DeleteOTP(user.ID, "reset_password"); err != nil {
		log.Printf("failed to delete OTP: %v", err)
	}


	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully!"})
}

//resend otp
func ResendForgotPassOTP(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
	}

	//bind JSON
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	//search user by email
	var user models.User
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "if your email is registered, you will received an OTP"})
		return
	}

	//check rate limit and max request before send new otp
	if err := otpService.CheckRateLimit(user.ID, "reset_password"); err != nil {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": err.Error()})
		return
	}

	//Resend OTP
	if _, err := otpService.CreateOTP(user.Email, "reset_password"); 
	err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resend OTP" + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "OTP has been resend to your email. Please check your inbox or spam folder.",
	})
}

func VerifyResetOTP(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
		OTP string `json:"otp" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H {"error": "User not found"})
		return
	}

	//otp verif
	valid, err := otpService.VerifyOTPByEmail(user.Email, "reset_password", input.OTP)
	if err != nil || !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired otp"})
		return
	}

	//set flag to true if verify otp success
	if err := database.DB.Model(&user).Update("reset_allowed", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset permission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "OTP verified successfully!",
		"success": true,
	})
}