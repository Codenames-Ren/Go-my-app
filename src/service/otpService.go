package service

import (
	"errors"
	"fmt"
	"math/rand"
	"time"

	"ren/backend-api/src/models"

	"golang.org/x/crypto/bcrypt"
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

func hashOTP(otp string) (string, error) {
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(otp), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedBytes), nil
}

func VerifyOTP(plainOTP, hashedOTP string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedOTP), []byte(plainOTP))
	return err == nil
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

	//generate plaintext otp
	plainCode := generateOTPCode()
	expiry := time.Now().Add(5 * time.Minute)

	//hash code
	hashedCode, err := hashOTP(plainCode)
	if err != nil {
		return nil, fmt.Errorf("failed to hash OTP: %v", err)
	}

	otp := &models.OTP{
		UserID: user.ID,
		Code: hashedCode,
		ExpiresAt: expiry,
		Purpose: purpose,
	}

	if err := s.DB.Create(otp).Error; err != nil {
		return nil, err
	}

	subject := "Your OTP Code"
	body := fmt.Sprintf("Hello %s, \n\nYour OTP code is: %s\n\nThis code will expire in 5 minutes. \n\nIf you did not request this, please ignore.", user.Email, plainCode)

	if err := s.EmailService.SendEmail(user.Email, subject, body); err != nil {
		return nil, err
	}

	tempOTP := &models.OTP{
		ID: otp.ID,
		UserID: otp.UserID,
		Code: plainCode,
		ExpiresAt: otp.ExpiresAt,
		Purpose: otp.Purpose,
		CreatedAt: otp.CreatedAt,
		Used: otp.Used,
	}

	return tempOTP, nil
}

func (s *OTPService) VerifyOTPByEmail(email, purpose, inputCode string) (bool, error) {

	//search user by email
	var user models.User
	if err := s.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return false, errors.New("user not found")
	}

	var otps []models.OTP
	err := s.DB.Where("user_id = ? AND purpose = ?", user.ID, purpose).Order("created_at DESC").Find(&otps).Error;
	if err != nil {
		return false, err
	}

	if len(otps) == 0 {
		return false, errors.New("no OTP found")
	}

	for _, otp := range otps {
		if otp.Used {
			continue
		}

		if time.Since(otp.CreatedAt) > time.Minute * 5 {
			continue
		}

		if VerifyOTP(inputCode, otp.Code) {
			otp.Used = true
			s.DB.Save(&otp)

			user.Status = "active"
			s.DB.Save(&user)

			return true, nil
		}
	}

	return false, errors.New("invalid or expired otp")
}

func (s *OTPService) DeleteOTP(userID, purpose string) error {
	return s.DB.Where("user_id = ? AND purpose = ?", userID, purpose).Delete(&models.OTP{}).Error
}