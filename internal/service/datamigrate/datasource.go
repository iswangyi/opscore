package datamigrate

import (
	coreError "opscore/error"
	"opscore/internal/model"
	"time"
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

// ColumnInfo 列信息
type ColumnInfo struct {
	Name         string `json:"name"`
	Type         string `json:"type"`
	IsNullable   bool   `json:"is_nullable"`
	DefaultValue string `json:"default_value"`
	Comment      string `json:"comment"`
}

// TableSchema 表结构信息
type TableSchema struct {
	Name    string       `json:"name"`
	Columns []ColumnInfo `json:"columns"`
	Indexes []string     `json:"indexes"`
	Comment string       `json:"comment"`
}

// Row 数据行
type Row map[string]interface{}

// ReadOptions 读取选项
type ReadOptions struct {
	Offset int    `json:"offset"`
	Limit  int    `json:"limit"`
	Where  string `json:"where,omitempty"`
}

// WriteOptions 写入选项
type WriteOptions struct {
	BatchSize int  `json:"batch_size"`
	Truncate  bool `json:"truncate"`
}

// DataSource 数据源接口
type DataSource interface {
	// Connect 连接数据源
	Connect(config DataSourceConfig) error

	// TestConnection 测试连接
	TestConnection() error

	// ListDatabases 列出所有数据库
	ListDatabases() ([]string, error)

	// ListTables 列出指定数据库的所有表
	ListTables(database string) ([]string, error)

	// GetTableSchema 获取表结构
	GetTableSchema(database, table string) (*TableSchema, error)

	// ReadRows 读取数据行
	ReadRows(database, table string, opts ReadOptions) ([]Row, error)

	// WriteRows 写入数据行
	WriteRows(database, table string, rows []Row, opts WriteOptions) error

	// CreateTable 创建表
	CreateTable(database string, schema *TableSchema) error

	// CreateDatabaseIfNotExists 创建数据库
	CreateDatabaseIfNotExists(database string) error

	// DropTable 删除表
	DropTable(database, table string) error

	// GetRowCount 获取表行数
	GetRowCount(database, table string) (int64, error)

	// Close 关闭连接
	Close() error

}



// DataSourceFactory 数据源工厂
type DataSourceFactory struct{}

// NewDataSource 创建数据源实例
func (f *DataSourceFactory) NewDataSource(sourceType model.DataSourceType) (DataSource, error) {
	switch sourceType {
	case model.DataSourceTypeMySQL:
		return &MySQLDataSource{}, nil
	case model.DataSourceTypePostgreSQL:
		// TODO: 实现 PostgreSQL 数据源
		return nil, coreError.ErrUnsupportedDataSource
	case model.DataSourceTypeMongoDB:
		// TODO: 实现 MongoDB 数据源
		return nil, coreError.ErrUnsupportedDataSource
	case model.DataSourceTypeMinIO:
		// TODO: 实现 MinIO 数据源
		return nil, coreError.ErrUnsupportedDataSource
	default:
		return nil, coreError.ErrUnsupportedDataSource
	}
}
