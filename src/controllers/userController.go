package controllers

import (
	"fmt"
	"net/http"
	"regexp"
	"ren/backend-api/src/database"
	"ren/backend-api/src/middlewares"
	"ren/backend-api/src/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

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

	hasSymbol := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).MatchString(password)
	if !hasSymbol {
		return false, "Password atleast have 1 Symbol!"
	}

	return true, ""
}

//Register User
func Register(c *gin.Context) {
	var input models.User
	if err  := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"Error": err.Error()})
		return
	}

	//validate password
	if valid, message := validatePassword(input.Password); !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": message})
		return
	}

	//Prefix ID by role
	var prefix string
	if input.Role == "admin"{
		prefix = "ADM"
	} else {
		prefix = "USR"
	}

	//Search ID by prefix
	var lastUser models.User
	var lastID string
	if err := database.DB.
	Unscoped().
	Where("id LIKE ?", prefix+"-%").
	Order("id DESC").First(&lastUser).
	Error; err == nil {
		lastID = lastUser.ID //ambil id terakhir
	}

	//Generate new ID
	newNumber := 1
	if lastID != "" {
		var lastNumber int
		fmt.Sscanf(lastID, prefix+"-%03d", &lastNumber)
		newNumber = lastNumber + 1
	}

	//set new ID
	input.ID = fmt.Sprintf("%s-%03d", prefix, newNumber)

	//hash Password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost) 
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}
	input.Password = string(hashedPassword)

//Save to database
if err := database.DB.Create(&input).Error; err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
return
}

//response json
c.JSON(http.StatusOK, gin.H{
	"message": "User Registered Successfuly!",
	"username": input.Username,
	"email": input.Email,
})
}

//Login user
func Login(c *gin.Context) {
	var input struct {
		Email string `json:"email"`
		Password string `json:"password"`
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

	//Generate JWT token
	token, err := middlewares.GenerateToken(user.Username, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	//Return token
	c.JSON(http.StatusOK, gin.H{"token": token})
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