package controllers

import (
	"log"
	"net/http"
	"ren/backend-api/src/database"
	"ren/backend-api/src/middlewares"
	"ren/backend-api/src/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

//Login user
func LoginInit(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	//Bind JSON ke struct
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	//Search user by email
	var user models.User
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	//Password Check
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if user.Status != "active" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Your account is not active. Please activate your account first or contact our admin for assistance."})
		return
	}

	//set cookie for login
	c.SetCookie("loginData", user.ID, 300, "/", "", false, true)

	//Send OTP for login
	_, err := otpService.CreateOTP(user.Email, "login")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate OTP: " + err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"Message": "OTP has been sent to your email. Please verify to complete login.",
	})	
}

func LoginComplete(c *gin.Context) {
	var req struct {
		Email 		string `json:"email" binding:"required"`
		OTP		 	string `json:"otp" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	//Take user data for jwt token
	var user models.User 
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found!"})
		return
	}

	//OTP verivication
	valid, err := otpService.VerifyOTPByEmail(user.Email, "login", req.OTP)
	if err != nil || !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired otp"})
		return
	}

	if user.Status != "active" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Your account is not active. Please activate your account first or contact our admin for assistance."})
		return
	}

	//take user id from cookie
	userID, err := c.Cookie("loginData")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Login session expired"})
		return
	}

	//validate user_id
	if userID != user.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID mismatch"})
		return
	}


	// //Generate JWT token
	token, err := middlewares.GenerateToken(user.Username, user.Role, user.Status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	
	//delete cookie after login success
	c.SetCookie("loginData", userID, 300, "/", "", false, true)


	//Delete otp after login success
	err = otpService.DeleteOTP(user.ID, "login")
	if err != nil {
		log.Printf("Failed to delete OTP: %v", err)
	}

	//return token
	c.JSON(http.StatusOK, gin.H{"token": token})

	log.Printf("User %s logged in successfully", user.ID)
	log.Printf("OTP verified for user: %s", user.ID)
}

//resend otp
func ResendLoginOTP(c *gin.Context) {
	userID, err := c.Cookie("loginData")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Login session expired"})
		return
	}

	//get user data
	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found!"})
		return
	}

	if user.Status != "active" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Your account is not active. Please activate your account first or contact our admin for assistance."})
		return
	}

	//check rate limit and max request before send new otp
	if err := otpService.CheckRateLimit(user.ID, "login"); err != nil {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": err.Error()})
		return
	}

	if err := otpService.CheckMaxRequest(user.ID, "login"); err != nil {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": err.Error()})
		return
	}

	_, err = otpService.CreateOTP(user.Email, "login")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resend OTP" + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "OTP has been resend to your email. Please check your inbox or spam folder.",
	})
}