package controllers

import (
	"fmt"
	"net/http"
	"ren/backend-api/src/models"
	"ren/backend-api/src/service"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type EventRequest struct {
	EventName		string		`json:"event_name" binding:"required"`
	Location		string		`json:"location" binding:"required"`
	OrderDeadline	time.Time	`json:"order_deadline" binding:"required"`
	EndDate			time.Time	`json:"end_date" binding:"required"`
	ImageName		string 		`json:"image_name" binding:"required"`
}

func CreateEvent(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req EventRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var existing models.Event
		if err := db.Where("event_name = ?", req.EventName).First(&existing).Error; err == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "event name already exists"})
			return
		}

		id, err := service.GenerateEventID(db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate event id"})
		}

		if req.OrderDeadline.After(req.EndDate) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Order deadline must not be longer than than the departure time"})
			return
		}

		if req.EndDate.Before(time.Now()) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "End date must be in the future"})
			return
		}

		event := models.Event{
			ID: 			id,
			EventName:		req.EventName,
			Location: 		req.Location,
			OrderDeadline: 	req.OrderDeadline,
			EndDate: 		req.EndDate,
			ImageName: 		req.ImageName,
			IsActive:		true,
		}

		if err := db.Create(&event).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create event"})
			return
		}

		c.JSON(http.StatusCreated, event)
	}
}

func GetAllEvent(db *gorm.DB) gin.HandlerFunc{
	return func(c *gin.Context) {
		var events []models.Event
		if err := db.Find(&events).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch events"})
			return
		}
		c.JSON(http.StatusOK, events)
	}
}

func UpdateEvent(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var event models.Event
		if err := db.Where("id = ?", id).First(&event).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
			return
		}

		var req EventRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if req.OrderDeadline.After(req.EndDate) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Order deadline cannot be later than the concert time."})
			return
		}

		if req.EndDate.Before(time.Now()) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "End date must be in the future"})
			return
		}

		event.EventName = req.EventName
		event.Location = req.Location
		event.OrderDeadline = req.OrderDeadline
		event.EndDate = req.EndDate
		event.ImageName = req.ImageName

		if err := db.Save(&event).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update event"})
			return
		}

		c.JSON(http.StatusOK, event)
	}
}

func ToggleEventStatus(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var event models.Event
		if err := db.Where("id = ?", id).First(&event).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
			return
		}

		event.IsActive = !event.IsActive

		if err := db.Save(&event).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle event status"})
			return
		}

		status := "disabled"
		if event.IsActive {
			status = "enabled"
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Event status updated successfully",
			"data": event,
			"status": status,
		})
	}
}

func DeleteEvent(db *gorm.DB) gin.HandlerFunc{
	return func(c *gin.Context) {
		id := c.Param("id")
		
		var event models.Event
		if err := db.Where("id = ?", id).First(&event).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
			return
		}

		if err := db.Delete(&event).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Event deleted successfully",
		})
	}
}

func ValidateEvent (db *gorm.DB, eventName string) (*models.Event, error) {
	var event models.Event
	if err := db.Where("event_name = ?", eventName).First(&event).Error; err != nil {
		return nil, fmt.Errorf("event not found")
	}

	if !event.IsActive {
		return nil, fmt.Errorf("this event is not available")
	}

	if time.Now().After(event.EndDate) {
		return nil, fmt.Errorf("campaign for this event has ended")
	}

	return &event, nil
}

func GetPublicEvents(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var events []models.Event
		if err := db.Where("is_active = ? AND end_date > ?", true, time.Now()).Order("end_date ASC").Find(&events).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch public events"})
			return
		}

		c.JSON(http.StatusOK, events)
	}
}