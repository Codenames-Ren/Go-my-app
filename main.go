package main

import (
	"ren/backend-api/src/database"
	"ren/backend-api/src/routes"

	"github.com/gin-gonic/gin"
)

func main() {
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