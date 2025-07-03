package datamigrate

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// MySQLDataSource MySQL数据源实现
type MySQLDataSource struct {
	db     *gorm.DB
	config DataSourceConfig
}

// Connect 连接MySQL数据库
func (m *MySQLDataSource) Connect(config DataSourceConfig) error {
	m.config = config

	// 构建DSN
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=True&loc=Local",
		config.Username,
		config.Password,
		config.Host,
		config.Port,
		config.Database,
		m.getCharset(),
	)

	// 配置GORM
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent), // 静默日志
	}

	db, err := gorm.Open(mysql.Open(dsn), gormConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to MySQL: %w", err)
	}

	// 配置连接池
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	m.db = db
	return nil
}

// TestConnection 测试连接
func (m *MySQLDataSource) TestConnection() error {
	if m.db == nil {
		return ErrConnectionFailed
	}

	sqlDB, err := m.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	return sqlDB.Ping()
}

// ListDatabases 列出所有数据库
func (m *MySQLDataSource) ListDatabases() ([]string, error) {
	var databases []string
	err := m.db.Raw("SHOW DATABASES").Scan(&databases).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list databases: %w", err)
	}
	return databases, nil
}

// ListTables 列出指定数据库的所有表
func (m *MySQLDataSource) ListTables(database string) ([]string, error) {
	var tables []string
	query := fmt.Sprintf("SHOW TABLES FROM `%s`", database)
	err := m.db.Raw(query).Scan(&tables).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list tables: %w", err)
	}
	return tables, nil
}

// GetTableSchema 获取表结构
func (m *MySQLDataSource) GetTableSchema(database, table string) (*TableSchema, error) {
	schema := &TableSchema{
		Name: table,
	}

	// 获取列信息
	columnsQuery := fmt.Sprintf(`
		SELECT 
			COLUMN_NAME,
			DATA_TYPE,
			IS_NULLABLE,
			COLUMN_DEFAULT,
			COLUMN_COMMENT
		FROM INFORMATION_SCHEMA.COLUMNS 
		WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
		ORDER BY ORDINAL_POSITION
	`, database, table)

	rows, err := m.db.Raw(columnsQuery, database, table).Rows()
	if err != nil {
		return nil, fmt.Errorf("failed to get table columns: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var column ColumnInfo
		var isNullable string
		var defaultValue sql.NullString

		err := rows.Scan(
			&column.Name,
			&column.Type,
			&isNullable,
			&defaultValue,
			&column.Comment,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan column info: %w", err)
		}

		column.IsNullable = isNullable == "YES"
		if defaultValue.Valid {
			column.DefaultValue = defaultValue.String
		}

		schema.Columns = append(schema.Columns, column)
	}

	// 获取索引信息
	indexesQuery := fmt.Sprintf(`
		SELECT INDEX_NAME 
		FROM INFORMATION_SCHEMA.STATISTICS 
		WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
		GROUP BY INDEX_NAME
	`, database, table)

	indexRows, err := m.db.Raw(indexesQuery, database, table).Rows()
	if err != nil {
		return nil, fmt.Errorf("failed to get table indexes: %w", err)
	}
	defer indexRows.Close()

	for indexRows.Next() {
		var indexName string
		err := indexRows.Scan(&indexName)
		if err != nil {
			return nil, fmt.Errorf("failed to scan index name: %w", err)
		}
		schema.Indexes = append(schema.Indexes, indexName)
	}

	// 获取表注释
	tableCommentQuery := fmt.Sprintf(`
		SELECT TABLE_COMMENT 
		FROM INFORMATION_SCHEMA.TABLES 
		WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
	`, database, table)

	var tableComment string
	err = m.db.Raw(tableCommentQuery, database, table).Scan(&tableComment).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get table comment: %w", err)
	}
	schema.Comment = tableComment

	return schema, nil
}

// ReadRows 读取数据行
func (m *MySQLDataSource) ReadRows(database, table string, opts ReadOptions) ([]Row, error) {
	query := fmt.Sprintf("SELECT * FROM `%s`.`%s`", database, table)

	if opts.Where != "" {
		query += " WHERE " + opts.Where
	}

	query += fmt.Sprintf(" LIMIT %d OFFSET %d", opts.Limit, opts.Offset)

	rows, err := m.db.Raw(query).Rows()
	if err != nil {
		return nil, fmt.Errorf("failed to read rows: %w", err)
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}

	var result []Row
	for rows.Next() {
		// 创建值的切片
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		// 扫描行数据
		err := rows.Scan(valuePtrs...)
		if err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		// 构建行数据
		row := make(Row)
		for i, col := range columns {
			val := values[i]
			if val != nil {
				row[col] = val
			}
		}

		result = append(result, row)
	}

	return result, nil
}

// WriteRows 写入数据行
func (m *MySQLDataSource) WriteRows(database, table string, rows []Row, opts WriteOptions) error {
	if len(rows) == 0 {
		return nil
	}

	// 获取列名
	columns := make([]string, 0)
	for col := range rows[0] {
		columns = append(columns, col)
	}

	// 构建INSERT语句
	placeholders := make([]string, len(columns))
	for i := range placeholders {
		placeholders[i] = "?"
	}

	// 批量插入
	for i := 0; i < len(rows); i += opts.BatchSize {
		end := i + opts.BatchSize
		if end > len(rows) {
			end = len(rows)
		}

		batch := rows[i:end]
		values := make([]interface{}, 0, len(batch)*len(columns))

		for _, row := range batch {
			for _, col := range columns {
				values = append(values, row[col])
			}
		}

		// 构建批量插入语句
		batchPlaceholders := make([]string, len(batch))
		for j := range batchPlaceholders {
			batchPlaceholders[j] = "(" + strings.Join(placeholders, ", ") + ")"
		}

		batchQuery := fmt.Sprintf("INSERT INTO `%s`.`%s` (`%s`) VALUES %s",
			database,
			table,
			strings.Join(columns, "`, `"),
			strings.Join(batchPlaceholders, ", "),
		)

		err := m.db.Exec(batchQuery, values...).Error
		if err != nil {
			return fmt.Errorf("failed to write batch rows: %w", err)
		}
	}

	return nil
}

// CreateTable 创建表
func (m *MySQLDataSource) CreateTable(database string, schema *TableSchema) error {
	if schema == nil || len(schema.Columns) == 0 {
		return ErrInvalidSchema
	}

	// 构建CREATE TABLE语句
	columnDefs := make([]string, len(schema.Columns))
	for i, col := range schema.Columns {
		def := fmt.Sprintf("`%s` %s", col.Name, col.Type)

		if !col.IsNullable {
			def += " NOT NULL"
		}

		if col.DefaultValue != "" {
			def += fmt.Sprintf(" DEFAULT %s", col.DefaultValue)
		}

		if col.Comment != "" {
			def += fmt.Sprintf(" COMMENT '%s'", col.Comment)
		}

		columnDefs[i] = def
	}

	query := fmt.Sprintf("CREATE TABLE `%s`.`%s` (\n  %s\n)",
		database,
		schema.Name,
		strings.Join(columnDefs, ",\n  "),
	)

	if schema.Comment != "" {
		query += fmt.Sprintf(" COMMENT='%s'", schema.Comment)
	}

	err := m.db.Exec(query).Error
	if err != nil {
		return fmt.Errorf("failed to create table: %w", err)
	}

	return nil
}

// DropTable 删除表
func (m *MySQLDataSource) DropTable(database, table string) error {
	query := fmt.Sprintf("DROP TABLE IF EXISTS `%s`.`%s`", database, table)
	err := m.db.Exec(query).Error
	if err != nil {
		return fmt.Errorf("failed to drop table: %w", err)
	}
	return nil
}

// GetRowCount 获取表行数
func (m *MySQLDataSource) GetRowCount(database, table string) (int64, error) {
	query := fmt.Sprintf("SELECT COUNT(*) FROM `%s`.`%s`", database, table)

	var count int64
	err := m.db.Raw(query).Scan(&count).Error
	if err != nil {
		return 0, fmt.Errorf("failed to get row count: %w", err)
	}

	return count, nil
}

// Close 关闭连接
func (m *MySQLDataSource) Close() error {
	if m.db != nil {
		sqlDB, err := m.db.DB()
		if err != nil {
			return fmt.Errorf("failed to get underlying sql.DB: %w", err)
		}
		return sqlDB.Close()
	}
	return nil
}

// getCharset 获取字符集
func (m *MySQLDataSource) getCharset() string {
	if m.config.Charset != "" {
		return m.config.Charset
	}
	return "utf8mb4"
}
