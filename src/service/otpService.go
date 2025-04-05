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

//Save OTP to Database
func (s *OTPService) CreateOTP(userID string, purpose string) (*models.OTP, error) {

	var latestOTP models.OTP
	err := s.DB.Where("user_id = ? AND purpose = ?", userID, purpose).Order("created_at DESC").First(&latestOTP).Error
	if err == nil {
		//found latest otp, check time difference
		if time.Since(latestOTP.CreatedAt) < time.Minute {
			return nil, errors.New("too many request, Please wait before requesting another OTP")
		}
	}

	code := generateOTPCode()
	expiry := time.Now().Add(5 * time.Minute) //Expired in 5 minute

	otp := &models.OTP{
		UserID: userID,
		Code: code,
		ExpiresAt: expiry,
		Purpose: purpose,
	}

	if err := s.DB.Create(otp).Error; err != nil {
		return nil, err
	}

	//Take user data from database
	var user models.User
	if err := s.DB.First(&user, "id = ?", userID).Error; err != nil {
		return nil, err
	}

	//send otp via email
	subject := "Your OTP Code"
	body := fmt.Sprintf("Hello %s, \n\nYour OTP code is: %s\n\nThis code will expire in 5 minutes.\n\nIf you did not request this, please ignore.", user.Email, otp.Code)
	if user.Email == "" {
		return nil, errors.New("user email is empty")
	}

	if err := s.EmailService.SendEmail(user.Email, subject, body); err != nil {
		return nil, err
	}

	return otp, nil
}

func (s *OTPService) VerifyOTP(userID, purpose, code string) (bool, error) {
	var otp models.OTP

	err := s.DB.Where("user_id = ? AND purpose = ? AND code = ?", userID, purpose, code).Order("created_at DESC").First(&otp).Error;

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

	return true, nil
}