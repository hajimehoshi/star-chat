package main

import (
	"log"
	"net/http"
	"time"
	"./starchat"
)

// DefaultMaxIdleConnsPerHost?

func main() {
	handler := starchat.NewHandler(nil)
	server := &http.Server{
		Addr:         ":8080",
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Minute,
	}
	log.Println("Start")
	log.Fatal(server.ListenAndServe())
}
