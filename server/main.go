package main

import (
	"fmt"
	"log"
	"net/http"
	redis "github.com/simonz05/godis"
)

func handler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hi there, I love %s!", r.URL.Path[1:])
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
}

func channelsHandler(w http.ResponseWriter, r *http.Request) {
}

func subscribingsHandler(w http.ResponseWriter, r *http.Request) {
}

func messagesHandler(w http.ResponseWriter, r *http.Request) {
	
}

type Foo struct {
	handler http.Handler
}

func (foo *Foo) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if foo.handler != nil {
		foo.handler.ServeHTTP(w, r)
	}
	w.Header().Set("Content-Type", "application/json")
}

func main() {
	redisClient := redis.New("", 0, "")
	res, err := redisClient.Hgetall("messages:1")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(res.StringArray())
	foo := &Foo{}
	http.HandleFunc("/", handler)
	http.HandleFunc("/users/", usersHandler)
	http.HandleFunc("/channels/", channelsHandler)
	http.HandleFunc("/subscribings/", subscribingsHandler)
	http.Handle("/messages/", foo)
	http.ListenAndServe(":8080", nil)
}
