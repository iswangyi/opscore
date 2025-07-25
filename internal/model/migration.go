package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// StringSlice 用于 GORM JSON 存储 []string
type StringSlice []string

func (s *StringSlice) Scan(value interface{}) error {
	if value == nil {
		*s = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		str, ok := value.(string)
		if !ok {
			return fmt.Errorf("Scan source is not []byte or string")
		}
		bytes = []byte(str)
	}
	return json.Unmarshal(bytes, s)
}

func (s StringSlice) Value() (driver.Value, error) {
	return json.Marshal(s)
}

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

// MigrationTask 迁移任务模型
type MigrationTask struct {
	gorm.Model
	TaskID         string          `json:"task_id" gorm:"uniqueIndex;type:varchar(255)"`
	SourceConfig   string          `json:"source_config" gorm:"type:text"`
	TargetConfig   string          `json:"target_config" gorm:"type:text"`
	Database       StringSlice     `json:"database" gorm:"type:json"`
	Tables         string          `json:"tables" gorm:"type:json"`
	Status         MigrationStatus `json:"status"`
	Progress       float64         `json:"progress"` // 0-100
	TotalRows      int64           `json:"total_rows"`
	MigratedRows   int64           `json:"migrated_rows"`
	FailedRows     int64           `json:"failed_rows"`
	StartTime      *time.Time      `json:"start_time"`
	EndTime        *time.Time      `json:"end_time"`
	ErrorMessage   string          `json:"error_message"`
	Logs           []string        `json:"logs" gorm:"type:text"`
	BatchSize      int             `json:"batch_size"`
	CreateSchema   bool            `json:"create_schema"`   // 是否创建表结构
	TruncateTarget bool            `json:"truncate_target"` // 是否清空目标表
	OnlySyncSchema bool            `json:"only_sync_schema"`
}

// MigrationStatus 迁移任务状态
type MigrationStatus string

const (
	MigrationStatusPending   MigrationStatus = "pending"
	MigrationStatusRunning   MigrationStatus = "running"
	MigrationStatusCompleted MigrationStatus = "completed"
	MigrationStatusFailed    MigrationStatus = "failed"
	MigrationStatusCancelled MigrationStatus = "cancelled"
)

// DataSourceType 数据源类型
type DataSourceType string

const (
	DataSourceTypeMySQL      DataSourceType = "mysql"
	DataSourceTypePostgreSQL DataSourceType = "postgresql"
	DataSourceTypeMongoDB    DataSourceType = "mongodb"
	DataSourceTypeMinIO      DataSourceType = "minio"
)

// DataSourceConfig 数据源配置
type DataSourceConfig struct {
	Type     DataSourceType `json:"type"`
	Host     string         `json:"host"`
	Port     int            `json:"port"`
	Database string         `json:"database"`
	Username string         `json:"username"`
	Password string         `json:"password"`
	SSLMode  string         `json:"ssl_mode,omitempty"`
	Charset  string         `json:"charset,omitempty"`
	Timeout  time.Duration  `json:"timeout,omitempty"`
}
