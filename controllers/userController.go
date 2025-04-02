package controllers

import (
	"net/http"
	"ren/backend-api/database"
	"ren/backend-api/middlewares"
	"ren/backend-api/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

//Register User
func Register(c *gin.Context) {
	var input models.User
	if err  := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"Error": err.Error()})
		return
	}

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