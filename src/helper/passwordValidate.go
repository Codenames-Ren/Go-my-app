package helper

import (
	"fmt"
	"regexp"
)

//Validate password to check if the password meets the criteria or not
func ValidatePassword(password string) (bool, string) {
	minLength := 8
	if len(password) < minLength {
		return false, fmt.Sprintf("Minimum password %d character", minLength)
	}

	//check validation
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	if !hasUpper {
		return false, "Password atleast have 1 Uppercase!"
	}

	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	if !hasLower {
		return false, "Password atleast have 1 Lowercase!"
	}

	hasSymbol := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]`).MatchString(password)
	if !hasSymbol {
		return false, "Password atleast have 1 Symbol!"
	}

	return true, ""
}