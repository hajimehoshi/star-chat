package starchat_test

import (
	"."
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"io/ioutil"
	"testing"
)

func TestHandler(t *testing.T) {
	handler := starchat.NewHandler(nil)
	server := httptest.NewServer(handler)
	defer server.Close()

	client := &http.Client{}
	{
		req, err := http.NewRequest("GET", server.URL + "/", nil)
		if err != nil {
			t.Fatal(err)
		}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		contentType := resp.Header.Get("Content-Type")
		wantContentType := "text/html; charset=utf-8"
		if contentType != wantContentType {
			t.Errorf("Content-Type = %q; want %q", contentType, wantContentType)
		}
	}
	{
		req, err := http.NewRequest("GET", server.URL + "/users/user1/ping", nil)
		if err != nil {
			t.Fatal(err)
		}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		contentType := resp.Header.Get("Content-Type")
		wantContentType := "application/json; charset=utf-8"
		if contentType != wantContentType {
			t.Errorf("Content-Type = %q; want %q", contentType, wantContentType)
		}
		body, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			t.Fatal(err)
		}
		v := map[string]string{}
		if err := json.Unmarshal(body, &v); err != nil {
			t.Fatal(err)
		}
		if v["result"] != "pong" {
			t.Errorf(`v["result"] = %q; want %q`, v["result"], "pong")
		}
	}
}
