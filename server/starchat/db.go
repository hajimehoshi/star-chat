package starchat

import (
)

type DB interface {
	Get(key []string) (interface{}, error)
	Set(key []string) error
	Multi(func(DB)) error
}

//redis "github.com/simonz05/godis"
// redisClient := redis.New("", 0, "")
// res, err := redisClient.Hgetall("messages:1")
// fmt.Println(res.StringArray())
