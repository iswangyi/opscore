package db

import (
	//sqllite
	"gorm.io/gorm"
	 "gorm.io/driver/sqlite"
)

type DB struct {
	*gorm.DB
}

var (
	DBInstance *DB
)

func NewGlobalDB() (*DB, error) {
	db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})

	if err != nil {
		panic(err)
	}
	DBInstance = &DB{
		DB: db,
	}
	return DBInstance, nil
}

func (d *DB) GetGlobalDB() *gorm.DB {
	return DBInstance.DB
}
