package db

import (
	"opscore/internal/log"
	"opscore/internal/model"

	"go.uber.org/zap"
)

func Migrate() error {
	logger := log.GetLogger()
	logger.Info("Migrating kubernetes database")
	db := DBInstance
	var k model.K8sClusterMetaData
	if err := db.DB.AutoMigrate(&k); err != nil {
		logger.Error("Failed to migrate kubernetes database", zap.Error(err))
		return err
	}

	var m model.MigrationTask
	if err := db.DB.AutoMigrate(&m); err != nil {
		logger.Error("Failed to migrate migration task database", zap.Error(err))
		return err
	}

	return nil

}
