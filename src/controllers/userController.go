package controllers

import (
	"fmt"
	"log"
	"net/http"
	"regexp"
	"ren/backend-api/src/database"
	"ren/backend-api/src/middlewares"
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

//Validate password to check if the password meets the criteria or not
func validatePassword(password string) (bool, string) {
	minLength := 8
	if len(password) < minLength {
		return false, fmt.Sprintf("Minimum password %d character", minLength)
	}

	//check validation
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	if !hasUpper {
		return false, "Password atleast have 1 Uppercase!"
	}

	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	if !hasLower {
		return false, "Password atleast have 1 Lowercase!"
	}

	hasSymbol := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]`).MatchString(password)
	if !hasSymbol {
		return false, "Password atleast have 1 Symbol!"
	}

	return true, ""
}

//Register User
func RegisterInit(c *gin.Context) {
	var input struct {
		Username 	string `json:"username" binding:"required"`
		Email 		string `json:"email" binding:"required,email"`
		Password 	string `json:"password" binding:"required"`
		Role	 	string `json:"role" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	//Password Validation
	if valid, message := validatePassword(input.Password); !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": message})
		return
	}

	//Check user has been used or not
	var existingUser models.User
	if err := database.DB.Where("email = ? OR username = ?", input.Email, input.Username).First(&existingUser).Error;
	err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email or username already in use!"})
		return
	}

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
		"message": "User registered successfully!",
		"username": user.Username,
		"email": user.Email,
	})
	
	log.Printf("User %s verified successfully", user.ID)
	log.Printf("OTP verified for user: %s", user.ID)
}

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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Your account is not active. Please activate your account first."})
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
		OTP						string `json:"otp" binding:"required"`
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
	if valid, message := validatePassword(input.Newpassword); !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": message})
		return
	}

	//search user by email
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

	//hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Newpassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	//update password in database
	if err := database.DB.Model(&user).Update("password", string(hashedPassword)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	//cleanup OTP afterr password reset success
	if err := otpService.DeleteOTP(user.ID, "reset_password"); err != nil {
		log.Printf("failed to delete OTP: %v", err)
	}


	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully!"})
}

func GetAllUsers(c *gin.Context) {
	var users []models.User

	//Get all users from Database
	if err := database.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fecth users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
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
	if valid, message := validatePassword(input.Newpassword); !valid {
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

func DeleteUser(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found!"})
		return
	}

	if err := database.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully!"})
}