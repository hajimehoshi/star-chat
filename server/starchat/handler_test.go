package starchat_test

import (
	"."
	"net/http/httptest"
	"testing"
)

func TestOK(t *testing.T) {
	handler := starchat.NewHandler(nil)
	server := httptest.NewServer(handler)
	defer server.Close()
	t.Log(server.URL)
}
