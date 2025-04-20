package routes

import "github.com/gin-gonic/gin"

func ViewRoute(router *gin.Engine) {

	router.Use(func(c *gin.Context) {
        c.Writer.Header().Set("Cache-Control", "no-store")
    })
	
	//Static route from public
	router.Static("/public", "./public")

	//redirect route to login page
	router.GET("/", func(c *gin.Context) {
		c.Redirect(302, "/home")
	})

	router.GET("/home", func(c *gin.Context) {
		c.File("./public/homepage/index.html")
	})

	router.GET("/login", func(c *gin.Context) {
		c.File("./public/login_form/index.html")
	})

	router.GET("/forgot-password", func(c *gin.Context) {
		c.File("./public/login_form/forgotpass.html")
	})

	router.GET("/reset-password-form", func(c *gin.Context) {
		c.File("./public/login_form/resetpass.html")
	})

	router.GET("/otp", func(c *gin.Context) {
		email := c.Query("email")
		purpose := c.Query("purpose")

		if email == "" || purpose == "" {
			c.String(400, "Missing query parameters")	
		}
		c.File("./public/login_form/otp.html")
	})
}