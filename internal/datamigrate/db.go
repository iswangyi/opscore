package datamigrate

import (
	"opscore/internal/db"
	"opscore/internal/log"

	"go.uber.org/zap"
)

// Migrate 执行数据库迁移
func Migrate() error {
	logger := log.GetLogger()
	logger.Info("Migrating datamigrate database tables")

	db := db.DBInstance.DB

	// 迁移迁移任务表
	if err := db.AutoMigrate(&MigrationTask{}); err != nil {
		logger.Error("Failed to migrate MigrationTask table", zap.Error(err))
		return err
	}

	// 迁移迁移日志表
	if err := db.AutoMigrate(&MigrationLog{}); err != nil {
		logger.Error("Failed to migrate MigrationLog table", zap.Error(err))
		return err
	}

	logger.Info("Successfully migrated datamigrate database tables")
	return nil
}
