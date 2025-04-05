package main

import (
	"log"
	"ren/backend-api/src/database"
	"ren/backend-api/src/routes"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	//Koneksi ke Database
	database.ConnectDB()

	//Inisialisasi Server
	router := gin.Default()

	//Setup Routing
	routes.UserRoutes(router)

	//Register route from otproute
	routes.RegisterOTPRoutes(router, database.DB)

	//Server berjalan di port 8080
	router.Run(":8080")
}