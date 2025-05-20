package kubernetes

import (
	"opscore/internal/db"
	"opscore/internal/log"
	"go.uber.org/zap"
)

func Migrate() error {
	logger := log.GetLogger()
	logger.Info("Migrating kubernetes database")
	db := db.DBInstance
	var k K8sClusterMetaData
	if err := db.DB.AutoMigrate(&k); err != nil {
		logger.Error("Failed to migrate kubernetes database", zap.Error(err))
		return err
	}
	return nil

}