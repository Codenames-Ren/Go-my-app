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
}

//Random 6 Digit OTP 
func generateOTPCode() string {
	rand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}

//Save OTP to Database
func (s *OTPService) CreateOTP(userID string, purpose string) (*models.OTP, error) {
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