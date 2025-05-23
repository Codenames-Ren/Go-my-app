package service

import (
	"fmt"
	"ren/backend-api/src/models"

	"gorm.io/gorm"
)

func GenerateEventID(db *gorm.DB) (string, error) {
	var lastEvent models.Event
	if err := db.Order("created_at desc").First(&lastEvent).Error; err != nil && err != gorm.ErrRecordNotFound {
		return "", err
	}

	var lastID int
	if lastEvent.ID != "" {
		fmt.Sscanf(lastEvent.ID, "EV-%03d", &lastID)
	}

	newID := fmt.Sprintf("EV-%03d", lastID+1)
	return newID, nil
}