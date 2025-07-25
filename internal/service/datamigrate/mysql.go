package datamigrate

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	coreError "opscore/error"

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
		Logger: logger.Default.LogMode(logger.Silent),
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
		return coreError.ErrConnectionFailed
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
	// 直接用 SHOW CREATE TABLE 判断表是否存在
	var tableName, createSQL string
	row := m.db.Raw(fmt.Sprintf("SHOW CREATE TABLE `%s`.`%s`", database, table)).Row()
	if err := row.Scan(&tableName, &createSQL); err != nil {
		return nil, fmt.Errorf("failed to get table DDL: %w", err)
	}
	// 这里只返回 TableSchema 的 name 字段，详细解析 DDL 可后续扩展
	schema := &TableSchema{
		Name: table,
	}
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

// WriteRows写入数据行
func (m *MySQLDataSource) WriteRows(database, table string, rows []Row, opts WriteOptions) error {
	if len(rows) == 0 {
		return nil
	}

	// 获取目标表字段顺序
	columns, err := m.GetTableColumns(database, table)
	if err != nil {
		return fmt.Errorf("failed to get table columns: %w", err)
	}

	// 构建INSERT语句
	placeholders := make([]string, len(columns))
	for i := range placeholders {
		placeholders[i] = "?"
	}

	maxRetry := 3
	for i := 0; i < len(rows); i += opts.BatchSize {
		end := i + opts.BatchSize
		if end > len(rows) {
			end = len(rows)
		}

		batch := rows[i:end]
		values := make([]interface{}, 0, len(batch)*len(columns))

		for _, row := range batch {
			for _, col := range columns {
				value, exists := row[col]
				if !exists {
					values = append(values, nil)
				} else if v, ok := value.([]uint8); ok {
					values = append(values, string(v))
				} else {
					values = append(values, value)
				}
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

		retry := 0
		for {
			err := m.db.Exec(batchQuery, values...).Error
			if err == nil {
				break
			}
			// 检查是否为连接失效类错误
			errStr := err.Error()
			if (strings.Contains(errStr, "invalid connection") || strings.Contains(errStr, "broken pipe")) && retry < maxRetry {
				retry++
				fmt.Printf("[WriteRows] Detected invalid connection, retrying %d/%d...\n", retry, maxRetry)
				// 关闭并重连
				if cerr := m.Close(); cerr != nil {
					fmt.Printf("[WriteRows] Close connection error: %v\n", cerr)
				}
				if cerr := m.Connect(m.config); cerr != nil {
					fmt.Printf("[WriteRows] Reconnect error: %v\n", cerr)
					return fmt.Errorf("failed to reconnect: %w", cerr)
				}
				continue
			}
			fmt.Printf("[WriteRows] Failed to write batch rows: %v\n", err)
			return fmt.Errorf("failed to write batch rows: %w", err)
		}
	}

	return nil
}

// CreateTable 创建表
func (m *MySQLDataSource) CreateTable(database string, schema *TableSchema) error {
	if schema == nil || len(schema.Columns) == 0 {
		return coreError.ErrInvalidSchema
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
		fmt.Printf("[GetRowCount] SQL: %s, error: %v\n", query, err)
		return 0, fmt.Errorf("failed to get row count: %w", err)
	}
	fmt.Printf("[GetRowCount] SQL: %s, count: %d\n", query, count)
	return count, nil
}

// CreateDatabaseIfNotExists 如果数据库不存在则创建
func (m *MySQLDataSource) CreateDatabaseIfNotExists(database string) error {
	if database == "" {
		return fmt.Errorf("database name is empty")
	}
	query := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET 'utf8mb4' COLLATE 'utf8mb4_general_ci'", database)
	if m.db == nil {
		// 临时新建无 database 连接
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/?charset=%s&parseTime=True&loc=Local",
			m.config.Username,
			m.config.Password,
			m.config.Host,
			m.config.Port,
			m.getCharset(),
		)
		gormConfig := &gorm.Config{
			Logger: logger.Default.LogMode(logger.Silent),
		}
		db, err := gorm.Open(mysql.Open(dsn), gormConfig)
		if err != nil {
			return fmt.Errorf("failed to connect to MySQL for create database: %w", err)
		}
		err = db.Exec(query).Error
		// 关闭临时连接
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
		return err
	}
	// 用已有连接
	return m.db.Exec(query).Error
}

// CreateTableFromSource 通过源库 SHOW CREATE TABLE 直接在目标库创建表
func (m *MySQLDataSource) CreateTableFromSource(source *MySQLDataSource, sourceDB, table, targetDB string) error {
	if source == nil || source.db == nil {
		return fmt.Errorf("source datasource is nil")
	}
	// 获取源表 DDL
	var tableName, createSQL string
	row := source.db.Raw(fmt.Sprintf("SHOW CREATE TABLE `%s`.`%s`", sourceDB, table)).Row()
	if err := row.Scan(&tableName, &createSQL); err != nil {
		return fmt.Errorf("failed to get source table DDL: %w", err)
	}
	// 替换 DDL 里的库名为目标库
	createSQL = strings.Replace(createSQL, fmt.Sprintf("CREATE TABLE `%s`", table), fmt.Sprintf("CREATE TABLE `%s`.`%s`", targetDB, table), 1)
	// 在目标库执行
	if err := m.db.Exec(createSQL).Error; err != nil {
		return fmt.Errorf("failed to create table on target: %w", err)
	}
	return nil
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

// keysOfRow 返回 Row 的所有 key
func keysOfRow(row Row) []string {
	keys := make([]string, 0, len(row))
	for k := range row {
		keys = append(keys, k)
	}
	return keys
}

func (m *MySQLDataSource) GetTableColumns(database, table string) ([]string, error) {
	var columns []string
	query := fmt.Sprintf("SHOW COLUMNS FROM `%s`.`%s`", database, table)
	rows, err := m.db.Raw(query).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var field, colType, null, key, extra string
		var def sql.NullString
		if err := rows.Scan(&field, &colType, &null, &key, &def, &extra); err != nil {
			return nil, err
		}
		columns = append(columns, field)
	}
	return columns, nil
}
