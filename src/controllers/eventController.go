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
		//get input from form
		eventName := c.PostForm("event_name")
		location := c.PostForm("location")
		orderDeadlineStr := c.PostForm("order_deadline")
		endDateStr := c.PostForm("end_date")

		if eventName == "" || location == "" || orderDeadlineStr == "" || endDateStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "You must input all the field"})
			return
		}

		orderDeadline, err := time.Parse(time.RFC3339, orderDeadlineStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order_deadline format"})
			return
		}

		endDate, err := time.Parse(time.RFC3339, endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_date format"})
			return
		}

		if orderDeadline.After(endDate) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Order deadline must not be later than the departure date"})
			return
		}

		if endDate.Before(time.Now()) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Departure times must be in the future"})
			return
		}

		//check event name
		var existing models.Event
		if err := db.Where("event_name = ?", eventName).First(&existing).Error; err == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Event already exists!"})
			return
		}

		//take image file from client side
		file, err := c.FormFile("image")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "file not found"})
			return
		}

		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), file.Filename)
		savepath := fmt.Sprintf("public/homepage/image/%s", filename)
		if err := c.SaveUploadedFile(file, savepath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
			return
		}

		//generate event id
		id, err := service.GenerateEventID(db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event ID"})
			return
		}

		//save to db
		event := models.Event {
			ID: 					id,
			EventName: 				eventName,
			Location: 				location,
			OrderDeadline: 			orderDeadline,
			EndDate: 				endDate,
			ImageName: 				filename,
			IsActive: 				true,
		}

		if err := db.Create(&event).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save event"})
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

func UpdateEvent (db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var event models.Event

		if err := db.Where("id = ?", id).First(&event).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
			return
		}

		//take data from client input
		eventName := c.PostForm("event_name")
		location := c.PostForm("location")
		orderDeadlineStr := c.PostForm("order_deadline")
		endDateStr := c.PostForm("end_date")

		if eventName == "" || location == "" || orderDeadlineStr == "" || endDateStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "All field are required to be filled in"})
			return
		}

		orderDeadline, err := time.Parse(time.RFC3339, orderDeadlineStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order_deadline format"})
			return
		}

		endDate, err := time.Parse(time.RFC3339, endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_date format"})
			return
		}

		if orderDeadline.After(endDate) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Order deadline must not be later than the departure date"})
			return
		}

		if endDate.Before(time.Now()) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Departure times must be in the future"})
			return
		}

		//check if admin change the image or not
		file, err := c.FormFile("image")
		filename := event.ImageName

		if file != nil {
			filename = fmt.Sprintf("%d_%s", time.Now().Unix(), file.Filename)
			savePath := fmt.Sprintf("public/homepage/image/%s", filename)

			if err := c.Copy().SaveUploadedFile(file, savePath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
				return
			}
		}

		//update event
		event.EventName = eventName
		event.Location = location
		event.OrderDeadline = orderDeadline
		event.EndDate =  endDate
		event.ImageName = filename

		if err := db.Save(&event).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
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