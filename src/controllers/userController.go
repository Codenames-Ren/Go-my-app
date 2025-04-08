package controllers

import (
	"net/http"
	"ren/backend-api/src/database"
	"ren/backend-api/src/helper"
	"ren/backend-api/src/models"
	"ren/backend-api/src/service"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

//Variable Service
var otpService *service.OTPService
var emailService *service.EmailService

//Initiate Service
func InitUserController(os *service.OTPService, es *service.EmailService) {
	otpService = os
	emailService = es
}

func UpdatePassword(c *gin.Context) {
	var input struct {
		Oldpassword string `json:"old_password"`
		Newpassword string `json:"new_password"`
		Confirmnewpassword string `json:"confirm_new_password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	//check new password and confirm password match or not
	if input.Newpassword != input.Confirmnewpassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "New password and confirm password doesn't match!"})
		return
	}

	//validate new password
	if valid, message := helper.ValidatePassword(input.Newpassword); !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": message})
		return
	}

	//get user from JWT token
	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	//search user by username
	var user models.User
	if err := database.DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	//checking old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Oldpassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Old password is incorrect"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Newpassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash new password"})
		return
	}

	//Updating password in database
	if err := database.DB.Model(&user).Update("password", string(hashedPassword)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfuly!"})
}