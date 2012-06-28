package starchat_test

import (
	"."
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"io/ioutil"
	"testing"
)

type testCase struct {
	RequestMethod       string
	RequestPath         string
	RequestHeader       map[string]string
	RequestBody         []byte // []string?
	ResponseStatusCode  int
	ResponseContentType string
	ResponseJSONBody    map[string]string // ?
}

func encodeBase64(str string) string {
	return base64.StdEncoding.EncodeToString([]byte(str))
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
		RequestHeader:      map[string]string{"Authorization": "Basic " + encodeBase64("foo:pass")},
		ResponseStatusCode: http.StatusOK,
		ResponseJSONBody:   map[string]string{"result": "pong",
		},
	},
	{
		RequestMethod:      "GET",
		RequestPath:        "/users/foo/ping",
		RequestHeader:      map[string]string{"Authorization": "Basic " + encodeBase64("foo:invalid_pass")},
		ResponseStatusCode: http.StatusUnauthorized,
	},
}

type dummyDB struct {
}

func (db *dummyDB) Get(key []string) (interface{}, error) {
	/*if key == []string{"users", "foo"} {
		return "hoge", nil
	}*/
	return nil, nil
}
func (db *dummyDB) Set(key []string) error {
	return nil
}
func (db *dummyDB) Multi(f func(starchat.DB)) error {
	return nil
}

func checkTestCase(t *testing.T, rootURL string, tc *testCase) {
	// TODO: Use RequestBody
	url := rootURL + tc.RequestPath
	req, err := http.NewRequest(tc.RequestMethod, url, nil)
	if err != nil {
		t.Fatal(err)
	}
	if tc.RequestHeader != nil {
		for name, value := range tc.RequestHeader {
			req.Header.Add(name, value);
		}
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
			t.Fatalf("Status Code = %d; want %d", statusCode, wantStatusCode)
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
	db      := &dummyDB{}
	handler := starchat.NewHandler(db)
	server  := httptest.NewServer(handler)
	defer server.Close()

	for _, testCase := range testCases {
		checkTestCase(t, server.URL, &testCase)
	}
}
