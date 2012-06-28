package starchat

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
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
	switch {
	case path == "/":
		self.serveTop(w, r)
	case regexp.MustCompile("^/users/[^/]+/stream$").MatchString(path):
		self.serveStream(w, r)
	default:
		self.serveItems(w, r)
	}
}

func (self *Handler) serveTop(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, "Hi there, I love %s!", r.URL.Path[1:])
}

func authorizedUser(r *http.Request) *User {
	authorization := r.Header.Get("Authorization")
	re := regexp.MustCompile("^Basic (.+)$")
	matches := re.FindStringSubmatch(authorization)
	if len(matches) != 2 {
		return nil
	}
	userAndPass, err := base64.StdEncoding.DecodeString(matches[1])
	if err != nil {
		return nil
	}
	arr := strings.SplitN(string(userAndPass), ":", 2)
	if len(arr) != 2 {
		return nil
	}
	userName := arr[0]
	pass     := arr[1]
	// TODO: Implement
	if pass != "pass" {
		return nil
	}
	// TODO: find
	return &User{Name: userName}
}

func (self *Handler) serveItems(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	user := authorizedUser(r)
	if user == nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	value := map[string]string {
		"result": "pong",
	}
	json, err := json.Marshal(value)
	if err != nil {
		log.Fatal(err)
	}
	w.Write(json)
}

func (self *Handler) serveStream(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	user := authorizedUser(r)
	if user == nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	w.Header().Set("Connection", "close")
}
