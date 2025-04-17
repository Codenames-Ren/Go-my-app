package controllers

import (
	"fmt"
	"log"
	"net/http"
	"ren/backend-api/src/database"
	"ren/backend-api/src/helper"
	"ren/backend-api/src/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

//Register User
func RegisterInit(c *gin.Context) {
	var input struct {
		Username 	string `json:"username" binding:"required"`
		Email 		string `json:"email" binding:"required,email"`
		Password 	string `json:"password" binding:"required"`
		Role	 	string `json:"role"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	//Password Validation
	if valid, message := helper.ValidatePassword(input.Password); !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": message})
		return
	}

	//Check user has been used or not
	var existingUser models.User
	if err := database.DB.Unscoped().Where("email = ? OR username = ?", input.Email, input.Username).First(&existingUser).Error;
	err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email or username already in use!"})
		return
	}

	// //Validation role
	// if input.Role != "user" && input.Role != "admin"  {
	// 	c.JSON(http.StatusForbidden, gin.H{"error": "Access Denied!"})
	// 	return
	// }

	//prefix id by role
	var prefix string
	if input.Role == "admin" {
		prefix = "ADM"
	} else {
		prefix = "USR"
	}

	//search id by prefix
	var lastUser models.User
	var lastID string
	if err := database.DB.Unscoped().
	Where("id LIKE ?", prefix+"-%").
	Order("id DESC").
	First(&lastUser).
	Error; err == nil {
		lastID = lastUser.ID
	}

	//Generate new ID
	newNumber := 1
	if lastID != "" {
		var lastNumber int
		if _, err := fmt.Sscanf(lastID, prefix+"-%03d", &lastNumber); err == nil {
			newNumber = lastNumber + 1
		}
	}

	//set new ID
	newUserID := fmt.Sprintf("%s-%03d", prefix, newNumber)

	//hashpassword for temporary user
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H {"error": "Failed to hash password"})
		return
	}

	//create temporary user with pending status
	tempUser := models.User{
		ID:			newUserID,
		Username: 	input.Username,
		Email: 		input.Email,
		Password: 	string(hashedPassword),
		Role: 		input.Role,
		Status: 	"pending",	
	}

	//save temporary user
	if err := database.DB.Create(&tempUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temporary user"})
		return
	}
	
	//OTP send for verification
	var otpErr error
	_, otpErr = otpService.CreateOTP(tempUser.Email, "registration")
	if otpErr != nil {
		database.DB.Delete(&tempUser)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate OTP: " + otpErr.Error()})
		return
	}

	//Temporary save in session
	c.SetCookie("registerData", newUserID, 300, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "OTP has been sent to your email. Please verify to confirm your registration.",
		"user_id": newUserID,
	})

	log.Printf("Generated new user ID: %s", newUserID)
	log.Printf("Temporary user created: %s", tempUser.Email)
}

func RegisterComplete(c *gin.Context) {
	var req struct {
		Email 		string `json:"email" binding:"required"`
		OTP		 	string `json:"otp" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	//search user by email
	var user models.User
	if err := database.DB.Where("email = ? AND status = ?", req.Email, "pending").First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User registration not found or already verified"})
		return
	}

	//OTP Verification
	valid, err := otpService.VerifyOTPByEmail(user.Email, "registration", req.OTP)
	if err != nil || !valid {
		errMsg := "Invalid or expired OTP"
		if err != nil {
			errMsg = err.Error()
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
		return
	}

	//update status from pending to active
	if err := database.DB.Model(&user).Update("status", "active").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate user"})
		return
	}

	//Delete otp after activation success
	if err := otpService.DeleteOTP(user.ID, "registration"); err != nil {
		log.Printf("Failed to delete OTP: %v", err)
	}

	//delete cookie after registration success
	c.SetCookie("registerData", "", -1, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "OTP verified successfully",
		"username": user.Username,
		"email": user.Email,
	})
	
	log.Printf("User %s verified successfully", user.ID)
	log.Printf("OTP verified for user: %s", user.ID)
}

//resend otp
func ResendRegisterOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	//get user data
	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found!"})
		return
	}

	//check rate limit and max request before send new otp
	if err := otpService.CheckRateLimit(user.ID, "registration"); err != nil {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": err.Error()})
		return
	}

	if err := otpService.CheckMaxRequest(user.ID, "registration"); err != nil {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": err.Error()})
		return
	}

	_, err := otpService.CreateOTP(user.Email, "registration")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resend OTP" + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "OTP has been resend to your email. Please check your inbox or spam folder.",
	})
}