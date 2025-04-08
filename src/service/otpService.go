package service

import (
	"errors"
	"fmt"
	"math/rand"
	"time"

	"ren/backend-api/src/models"

	"gorm.io/gorm"
)

type OTPService struct {
	DB *gorm.DB
	EmailService *EmailService
}

//Random 6 Digit OTP 
func generateOTPCode() string {
	rand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}

//rate limiting
func (s *OTPService) CheckRateLimit(userID string, purpose string) error {
	var latestOTP models.OTP
	err := s.DB.Where("user_id = ? AND purpose = ?", userID, purpose).Order("created_at DESC").First(&latestOTP).Error

	if err == nil && time.Since(latestOTP.CreatedAt) < time.Minute {
		return errors.New("too many request, please wait before requesting another OTP")
	}
	return nil
}

//checking request
func (s *OTPService) CheckMaxRequest(userID string, purpose string) error {
	var count int64
	s.DB.Model(&models.OTP{}).Where("user_id = ? AND purpose = ? AND created_at >= ?", userID, purpose, time.Now().Add(-24*time.Hour)).Count(&count)

	if count >= 5 {

		var lastOTP models.OTP
		err := s.DB.Where("user_id = ? AND purpose = ?", userID, purpose).Order("created_at DESC").First(&lastOTP).Error;
		if err != nil {
			return errors.New("failed to check OTP history")
		}

		cooldown := 15 * time.Minute
		if time.Since(lastOTP.CreatedAt) < cooldown {
			remaining := cooldown - time.Since(lastOTP.CreatedAt)
			return fmt.Errorf("you have reached the maximum OTP request limit. Please wait %d minutes before trying again", int(remaining.Minutes())+1)
	}
}

	return nil
}

//Save OTP to Database
func (s *OTPService) CreateOTP(email string, purpose string) (*models.OTP, error) {
	var user models.User
	if err := s.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, errors.New("user not found")
	}

	if user.Email == "" {
		return nil, errors.New("user email is empty")
	}

	if err := s.CheckRateLimit(user.ID, purpose); err != nil {
		return nil, err
	}

	if err := s.CheckMaxRequest(user.ID, purpose); err != nil {
		return nil, err
	}

	code := generateOTPCode()
	expiry := time.Now().Add(5 * time.Minute)

	otp := &models.OTP{
		UserID: user.ID,
		Code: code,
		ExpiresAt: expiry,
		Purpose: purpose,
	}

	if err := s.DB.Create(otp).Error; err != nil {
		return nil, err
	}

	subject := "Your OTP Code"
	body := fmt.Sprintf("Hello %s, \n\nYour OTP code is: %s\n\nThis code will expire in 5 minutes. \n\nIf you did not request this, please ignore.", user.Email, otp.Code)

	if err := s.EmailService.SendEmail(user.Email, subject, body); err != nil {
		return nil, err
	}
	return otp, nil
}

func (s *OTPService) VerifyOTPByEmail(email, purpose, code string) (bool, error) {

	//search user by email
	var user models.User
	if err := s.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return false, errors.New("user not found")
	}

	var otp models.OTP
	err := s.DB.Where("user_id = ? AND purpose = ? AND code = ?", user.ID, purpose, code).Order("created_at DESC").First(&otp).Error;

	if err != nil {
		return false, err
	}

	//Expired Check
	if time.Since(otp.CreatedAt) > time.Minute*5 {
		return false, errors.New("OTP has expired")
	}

	//check otp has used or not
	if otp.Used {
		return false, errors.New("OTP already used")
	}

	otp.Used = true
	s.DB.Save(&otp)

	//update status user
	user.Status = "active"
	s.DB.Save(&user)

	return true, nil
}

func (s *OTPService) DeleteOTP(userID, purpose string) error {
	return s.DB.Where("user_id = ? AND purpose = ?", userID, purpose).Delete(&models.OTP{}).Error
}