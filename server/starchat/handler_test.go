package starchat_test

import (
	"net/http/httptest"
	"starchat"
	"testing"
)

func TestOK(t *testing.T) {
	handler := starchat.NewHandler(nil)
	server := httptest.NewServer(handler)
	defer server.Close()
	t.Log(server.URL)
}
