package datamigrate

import (
	"time"

	"gorm.io/gorm"
)

// MigrationStatus 迁移任务状态
type MigrationStatus string

const (
	MigrationStatusPending   MigrationStatus = "pending"
	MigrationStatusRunning   MigrationStatus = "running"
	MigrationStatusCompleted MigrationStatus = "completed"
	MigrationStatusFailed    MigrationStatus = "failed"
	MigrationStatusCancelled MigrationStatus = "cancelled"
)

// MigrationTask 迁移任务模型
type MigrationTask struct {
	gorm.Model
	TaskID         string           `json:"task_id" gorm:"uniqueIndex"`
	SourceConfig   DataSourceConfig `json:"source_config" gorm:"type:text"`
	TargetConfig   DataSourceConfig `json:"target_config" gorm:"type:text"`
	Database       string           `json:"database"`
	Tables         []string         `json:"tables" gorm:"type:text"`
	Status         MigrationStatus  `json:"status"`
	Progress       float64          `json:"progress"` // 0-100
	TotalRows      int64            `json:"total_rows"`
	MigratedRows   int64            `json:"migrated_rows"`
	FailedRows     int64            `json:"failed_rows"`
	StartTime      *time.Time       `json:"start_time"`
	EndTime        *time.Time       `json:"end_time"`
	ErrorMessage   string           `json:"error_message"`
	Logs           []string         `json:"logs" gorm:"type:text"`
	BatchSize      int              `json:"batch_size"`
	CreateSchema   bool             `json:"create_schema"`   // 是否创建表结构
	TruncateTarget bool             `json:"truncate_target"` // 是否清空目标表
}

// MigrationLog 迁移日志
type MigrationLog struct {
	gorm.Model
	TaskID    string    `json:"task_id"`
	Level     string    `json:"level"` // info, warn, error
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

// MigrationProgress 迁移进度
type MigrationProgress struct {
	TaskID        string          `json:"task_id"`
	Status        MigrationStatus `json:"status"`
	Progress      float64         `json:"progress"`
	TotalRows     int64           `json:"total_rows"`
	MigratedRows  int64           `json:"migrated_rows"`
	FailedRows    int64           `json:"failed_rows"`
	CurrentTable  string          `json:"current_table"`
	StartTime     *time.Time      `json:"start_time"`
	EndTime       *time.Time      `json:"end_time"`
	ErrorMessage  string          `json:"error_message"`
	EstimatedTime string          `json:"estimated_time"`
}

// TableMigrationResult 表迁移结果
type TableMigrationResult struct {
	TableName    string    `json:"table_name"`
	Success      bool      `json:"success"`
	TotalRows    int64     `json:"total_rows"`
	MigratedRows int64     `json:"migrated_rows"`
	FailedRows   int64     `json:"failed_rows"`
	ErrorMessage string    `json:"error_message"`
	StartTime    time.Time `json:"start_time"`
	EndTime      time.Time `json:"end_time"`
}

// MigrationSummary 迁移摘要
type MigrationSummary struct {
	TaskID        string                 `json:"task_id"`
	Status        MigrationStatus        `json:"status"`
	TotalTables   int                    `json:"total_tables"`
	SuccessTables int                    `json:"success_tables"`
	FailedTables  int                    `json:"failed_tables"`
	TotalRows     int64                  `json:"total_rows"`
	MigratedRows  int64                  `json:"migrated_rows"`
	FailedRows    int64                  `json:"failed_rows"`
	StartTime     *time.Time             `json:"start_time"`
	EndTime       *time.Time             `json:"end_time"`
	Duration      string                 `json:"duration"`
	TableResults  []TableMigrationResult `json:"table_results"`
	ErrorMessage  string                 `json:"error_message"`
}
