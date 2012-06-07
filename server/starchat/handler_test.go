package starchat_test

import (
	"."
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOK(t *testing.T) {
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
}
