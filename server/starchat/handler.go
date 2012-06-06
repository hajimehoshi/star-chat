package starchat

import (
	"fmt"
	"net/http"
)

const (
	PUBLIC = iota
	PRIVATE
)

type User struct {
	Name     string
	Nick     string
	Keywords []string
}

type Channel struct {
	Name    string
	Privacy int
}

type Message struct {
	Id        uint64
	CreatedAt uint64
	Body      string
	UserName  string
}

type Subscribing struct {
	ChannelName string
	UserName    string
}

type Handler struct {
	db DB
}

func NewHandler(db DB) *Handler {
	return &Handler{
		db: db,
	}
}

func (self *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	switch path {
	case "/":
		self.serveTop(w, r)
	case "/messages/stream":
		self.serveStream(w, r)
	default:
		self.serveItems(w, r)
	}
}

func (self *Handler) serveTop(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	fmt.Fprintf(w, "Hi there, I love %s!", r.URL.Path[1:])
}

func (self *Handler) serveItems(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
}

func (self *Handler) serveStream(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Connection", "close")
}
