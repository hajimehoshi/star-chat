package starchat_test

import (
	"."
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"io/ioutil"
	"testing"
)

type testCase struct {
	RequestMethod       string
	RequestPath         string
	RequestBody         []byte // []string?
	ResponseStatusCode  int
	ResponseContentType string
	ResponseJSONBody    map[string]string // ?
}

var testCases = []testCase{
	{
		RequestMethod:       "GET",
		RequestPath:         "/",
		ResponseStatusCode:  http.StatusOK,
		ResponseContentType: "text/html; charset=utf-8",
	},
	{
		RequestMethod:      "GET",
		RequestPath:        "/users/foo/ping",
		ResponseStatusCode: http.StatusOK,
	ResponseJSONBody: map[string]string{
			"result": "pong",
		},
	},
}

func checkTestCase(t *testing.T, rootURL string, tc *testCase) {
	// TODO: Use RequestBody
	url := rootURL + tc.RequestPath
	req, err := http.NewRequest(tc.RequestMethod, url, nil)
	if err != nil {
		t.Fatal(err)
	}
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	{
		statusCode     := resp.StatusCode
		wantStatusCode := tc.ResponseStatusCode
		if statusCode != wantStatusCode {
			t.Errorf("Status Code = %q; want %q", statusCode, wantStatusCode)
		}
	}
	{
		contentType     := resp.Header.Get("Content-Type")
		wantContentType := "application/json; charset=utf-8"
		if tc.ResponseContentType != "" {
			wantContentType = tc.ResponseContentType
		}
		if contentType != wantContentType {
			t.Errorf("Content-Type = %q; want %q", contentType, wantContentType)
		}
	}
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	if tc.ResponseJSONBody != nil {
		v := map[string]interface{}{}
		if err := json.Unmarshal(body, &v); err != nil {
			t.Fatal(err)
		}
		//t.Log(v)
		for key, value := range v {
			wantValue := tc.ResponseJSONBody[key]
			if value != wantValue {
				t.Errorf("v[%q] = %q; want %q", key, value, wantValue)
			}
		}
	}
}

func TestHandler(t *testing.T) {
	handler := starchat.NewHandler(nil)
	server := httptest.NewServer(handler)
	defer server.Close()

	for _, testCase := range testCases {
		checkTestCase(t, server.URL, &testCase)
	}
}
