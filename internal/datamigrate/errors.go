package datamigrate

import "errors"

var (
	// ErrUnsupportedDataSource 不支持的数据源类型
	ErrUnsupportedDataSource = errors.New("unsupported data source type")

	// ErrConnectionFailed 连接失败
	ErrConnectionFailed = errors.New("connection failed")

	// ErrTableNotFound 表不存在
	ErrTableNotFound = errors.New("table not found")

	// ErrDatabaseNotFound 数据库不存在
	ErrDatabaseNotFound = errors.New("database not found")

	// ErrInvalidSchema 无效的表结构
	ErrInvalidSchema = errors.New("invalid table schema")

	// ErrMigrationTaskNotFound 迁移任务不存在
	ErrMigrationTaskNotFound = errors.New("migration task not found")

	// ErrMigrationTaskRunning 迁移任务正在运行
	ErrMigrationTaskRunning = errors.New("migration task is running")

	// ErrMigrationTaskCompleted 迁移任务已完成
	ErrMigrationTaskCompleted = errors.New("migration task is completed")

	// ErrInvalidConfig 无效配置
	ErrInvalidConfig = errors.New("invalid configuration")
)
