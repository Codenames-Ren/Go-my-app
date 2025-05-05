package service

import (
	"bytes"
	"html/template"
	"log"
	"time"
)

type InvoiceData struct {
	Name        string
	TicketType  string
	TicketPrice float64
	OrderCount  int
	TotalPrice  float64
	PaymentTo   string
	TicketCode  string
	Now         time.Time
}

type InvoiceService struct {
	EmailService *EmailService
}

func (s *InvoiceService) SendInvoiceHTML(email string, data InvoiceData) error {
	tmpl, err := template.ParseFiles("templates/invoiceEmail.html")

	if err != nil {
		log.Println("Failed to parse invoice template: ", err)
		return err
	}

	var buf bytes.Buffer
	err = tmpl.Execute(&buf, data)
	if err != nil {
		log.Println("Failed to Execute Invoice Template: ", err)
		return err
	}

	subject := "Invoice Pemesanan Tiket"

	go func ()  {
		if err := s.EmailService.SendHTMLEmail(email, subject, buf.String()); err != nil {
			log.Println("Gagal mengirim invoice", err)
		}
 	}()

	return nil
}