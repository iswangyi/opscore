package datamigrate

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	coreError "opscore/error"
	"opscore/internal/db"
	"opscore/internal/log"
	"opscore/internal/model"
	"strings"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// MigrationService 迁移服务
type MigrationService struct {
	db        *gorm.DB
	logger    *zap.Logger
	Tasks     map[string]*model.MigrationTask
	taskMutex sync.RWMutex
	Factory   *DataSourceFactory
}

// NewMigrationService 创建迁移服务实例
func NewMigrationService() *MigrationService {
	return &MigrationService{
		db:      db.DBInstance.DB,
		logger:  log.GetLogger(),
		Tasks:   make(map[string]*model.MigrationTask),
		Factory: &DataSourceFactory{},
	}
}

// CreateMigrationTask 创建迁移任务
func (s *MigrationService) CreateMigrationTask(req *CreateMigrationRequest) (*model.MigrationTask, error) {
	// 生成任务ID
	taskID := uuid.New().String()

	// tables 转为 JSON 字符串
	tablesJson, _ := json.Marshal(req.Tables)

	// 提取所有数据库名
	dbSet := make(map[string]struct{})
	// 1. 从 req.Database 逗号分隔提取
	for _, db := range strings.Split(req.Database, ",") {
		db = strings.TrimSpace(db)
		if db != "" {
			dbSet[db] = struct{}{}
		}
	}
	// 2. 从 req.Tables 里提取 db.table
	for _, t := range req.Tables {
		if parts := strings.SplitN(t, ".", 2); len(parts) == 2 {
			dbSet[parts[0]] = struct{}{}
		}
	}
	// 转为 []string
	dbList := make([]string, 0, len(dbSet))
	for db := range dbSet {
		dbList = append(dbList, db)
	}

	// 创建任务
	sourceConfigStr, _ := json.Marshal(req.SourceConfig)
	targetConfigStr, _ := json.Marshal(req.TargetConfig)
	task := &model.MigrationTask{
		TaskID:         taskID,
		SourceConfig:   string(sourceConfigStr),
		TargetConfig:   string(targetConfigStr),
		Database:       dbList,
		Tables:         string(tablesJson),
		Status:         model.MigrationStatusPending,
		Progress:       0,
		BatchSize:      req.BatchSize,
		CreateSchema:   req.CreateSchema,
		TruncateTarget: req.TruncateTarget,
		OnlySyncSchema: req.OnlySyncSchema,
	}

	// 保存到数据库
	if err := s.db.Create(task).Error; err != nil {
		return nil, fmt.Errorf("failed to create migration task: %w", err)
	}

	// 添加到内存任务列表
	s.taskMutex.Lock()
	s.Tasks[taskID] = task
	s.taskMutex.Unlock()

	s.logger.Info("Created migration task", zap.String("task_id", taskID))
	return task, nil
}

// StartMigration 开始迁移任务
func (s *MigrationService) StartMigration(taskID string) error {
	s.taskMutex.Lock()
	task, exists := s.Tasks[taskID]
	if !exists {
		s.taskMutex.Unlock()
		return coreError.ErrMigrationTaskNotFound
	}

	if task.Status == model.MigrationStatusRunning {
		s.taskMutex.Unlock()
		return coreError.ErrMigrationTaskRunning
	}

	if task.Status == model.MigrationStatusCompleted {
		s.taskMutex.Unlock()
		return coreError.ErrMigrationTaskCompleted
	}

	task.Status = model.MigrationStatusRunning
	now := time.Now()
	task.StartTime = &now
	s.taskMutex.Unlock()

	// 更新数据库
	if err := s.db.Model(task).Updates(map[string]interface{}{
		"status":     task.Status,
		"start_time": task.StartTime,
	}).Error; err != nil {
		return fmt.Errorf("failed to update task status: %w", err)
	}

	// 异步执行迁移
	go s.executeMigration(taskID)

	return nil
}

// executeMigration 执行迁移任务
func (s *MigrationService) executeMigration(taskID string) {
	s.taskMutex.RLock()
	task := s.Tasks[taskID]
	s.taskMutex.RUnlock()

	var srcCfg model.DataSourceConfig
	var tgtCfg model.DataSourceConfig
	if err := json.Unmarshal([]byte(task.SourceConfig), &srcCfg); err != nil {
		s.updateTaskStatus(taskID, model.MigrationStatusFailed, "Failed to parse source config: "+err.Error())
		return
	}
	if err := json.Unmarshal([]byte(task.TargetConfig), &tgtCfg); err != nil {
		s.updateTaskStatus(taskID, model.MigrationStatusFailed, "Failed to parse target config: "+err.Error())
		return
	}

	defer func() {
		if r := recover(); r != nil {
			s.logger.Error("Migration task panicked", zap.String("task_id", taskID), zap.Any("panic", r))
			s.updateTaskStatus(taskID, model.MigrationStatusFailed, fmt.Sprintf("Task panicked: %v", r))
		}
	}()

	s.logger.Info("Starting migration task", zap.String("task_id", taskID))

	// 创建源和目标数据源
	sourceDS, err := s.Factory.NewDataSource(srcCfg.Type)
	if err != nil {
		s.updateTaskStatus(taskID, model.MigrationStatusFailed, fmt.Sprintf("Failed to create source data source: %v", err))
		return
	}
	defer sourceDS.Close()

	targetDS, err := s.Factory.NewDataSource(tgtCfg.Type)
	if err != nil {
		s.updateTaskStatus(taskID, model.MigrationStatusFailed, fmt.Sprintf("Failed to create target data source: %v", err))
		return
	}
	defer targetDS.Close()

	// 连接数据源
	localSrcCfg := DataSourceConfig{
		Type:     DataSourceType(srcCfg.Type),
		Host:     srcCfg.Host,
		Port:     srcCfg.Port,
		Database: srcCfg.Database,
		Username: srcCfg.Username,
		Password: srcCfg.Password,
		SSLMode:  srcCfg.SSLMode,
		Charset:  srcCfg.Charset,
		Timeout:  srcCfg.Timeout,
	}
	localTgtCfg := DataSourceConfig{
		Type:     DataSourceType(tgtCfg.Type),
		Host:     tgtCfg.Host,
		Port:     tgtCfg.Port,
		Database: tgtCfg.Database,
		Username: tgtCfg.Username,
		Password: tgtCfg.Password,
		SSLMode:  tgtCfg.SSLMode,
		Charset:  tgtCfg.Charset,
		Timeout:  tgtCfg.Timeout,
	}

	if err := sourceDS.Connect(localSrcCfg); err != nil {
		s.updateTaskStatus(taskID, model.MigrationStatusFailed, fmt.Sprintf("Failed to connect source: %v", err))
		return
	}

	if err := targetDS.Connect(localTgtCfg); err != nil {
		s.logger.Error("Failed to connect target", zap.Error(err), zap.Any("localTgtCfg", localTgtCfg))
		if strings.Contains(err.Error(), "Unknown database") {
			// 自动创建数据库
			if localTgtCfg.Database == "" {
				localTgtCfg.Database = localSrcCfg.Database
			}
			if err := targetDS.CreateDatabaseIfNotExists(localTgtCfg.Database); err != nil {
				s.updateTaskStatus(taskID, model.MigrationStatusFailed, fmt.Sprintf("Failed to create target database: %v", err))
				return
			}
			// 创建后重试连接
			if err := targetDS.Connect(localTgtCfg); err != nil {
				s.updateTaskStatus(taskID, model.MigrationStatusFailed, fmt.Sprintf("Failed to connect target after create db: %v", err))
				return
			}
		} else {
			s.updateTaskStatus(taskID, model.MigrationStatusFailed, fmt.Sprintf("Failed to connect target: %v", err))
			return
		}
	}

	// 测试连接
	if err := sourceDS.TestConnection(); err != nil {
		s.updateTaskStatus(taskID, model.MigrationStatusFailed, fmt.Sprintf("Source connection test failed: %v", err))
		return
	}

	if err := targetDS.TestConnection(); err != nil {
		s.updateTaskStatus(taskID, model.MigrationStatusFailed, fmt.Sprintf("Target connection test failed: %v", err))
		return
	}

	// 获取要迁移的表列表
	var tables []string
	if task.Tables != "" {
		if err := json.Unmarshal([]byte(task.Tables), &tables); err != nil {
			s.updateTaskStatus(taskID, model.MigrationStatusFailed, fmt.Sprintf("Failed to parse tables: %v", err))
			return
		}
	} else {
		// 取第一个数据库名
		mainDB := ""
		if len(task.Database) > 0 {
			mainDB = task.Database[0]
		}
		tables, err = sourceDS.ListTables(mainDB)
		if err != nil {
			s.updateTaskStatus(taskID, model.MigrationStatusFailed, fmt.Sprintf("Failed to list tables: %v", err))
			return
		}
	}

	// 计算总行数
	var totalRows int64
	for _, table := range tables {
		dbName, tblName, err := parseTableName(table)
		if err != nil {
			s.logger.Error("Invalid table name format", zap.String("task_id", taskID), zap.String("table", table), zap.Error(err))
			continue // 跳过该表
		}
		count, err := sourceDS.GetRowCount(dbName, tblName)
		if err != nil {
			s.logger.Warn("Failed to get row count", zap.String("table", table), zap.Error(err))
			continue
		}
		totalRows += count
	}

	s.updateTaskProgress(taskID, 0, totalRows, 0, "")

	// 迁移每个表
	var migratedRows int64
	var failedRows int64

	for i, table := range tables {
		dbName, tblName, err := parseTableName(table)
		if err != nil {
			s.logger.Error("Invalid table name format", zap.String("task_id", taskID), zap.String("table", table), zap.Error(err))
			continue // 跳过该表
		}
		s.updateTaskProgress(taskID, float64(i)/float64(len(tables))*100, totalRows, migratedRows, tblName)

		tableResult := s.migrateTable(taskID, sourceDS, targetDS, task, dbName, tblName)
		migratedRows += tableResult.MigratedRows
		failedRows += tableResult.FailedRows

		if !tableResult.Success {
			s.logger.Error("Table migration failed",
				zap.String("task_id", taskID),
				zap.String("table", tblName),
				zap.String("error", tableResult.ErrorMessage))
		}
	}

	// 完成迁移
	s.updateTaskProgress(taskID, 100, totalRows, migratedRows, "")
	s.updateTaskStatus(taskID, model.MigrationStatusCompleted, "")

	s.logger.Info("Migration task completed",
		zap.String("task_id", taskID),
		zap.Int64("total_rows", totalRows),
		zap.Int64("migrated_rows", migratedRows),
		zap.Int64("failed_rows", failedRows))
}

// parseTableName 解析表名，返回库名和表名，必须是 db.table 格式
func parseTableName(table string) (string, string, error) {
	parts := strings.SplitN(table, ".", 2)
	if len(parts) != 2 {
		return "", "", fmt.Errorf("invalid table name format: %s, must be db.table", table)
	}
	return parts[0], parts[1], nil
}

// migrateTable 迁移单个表
func (s *MigrationService) migrateTable(taskID string, sourceDS, targetDS DataSource, task *model.MigrationTask, dbName, tableName string) *model.TableMigrationResult {
	s.logger.Info("migrateTable", zap.String("task_id", taskID), zap.String("table", tableName), zap.String("database", dbName))

	// 新增：每个表迁移前都确保目标库已存在
	if tgtMy, ok := targetDS.(*MySQLDataSource); ok {
		errDb := tgtMy.CreateDatabaseIfNotExists(dbName)
		if errDb != nil {
			s.logger.Error("Failed to ensure target database exists before migrating table", zap.String("task_id", taskID), zap.String("database", dbName), zap.Error(errDb))
			return &model.TableMigrationResult{
				Success:      false,
				ErrorMessage: fmt.Sprintf("Failed to ensure target database exists: %v", errDb),
			}
		}
	}

	var tgtCfg model.DataSourceConfig
	if err := json.Unmarshal([]byte(task.TargetConfig), &tgtCfg); err != nil {
		return &model.TableMigrationResult{
			Success:      false,
			ErrorMessage: "Failed to parse target config: " + err.Error(),
		}
	}

	if dbName == "" {
		return &model.TableMigrationResult{
			Success:      false,
			ErrorMessage: "Source database is not set",
		}
	}
	if tgtCfg.Database == "" {
		return &model.TableMigrationResult{
			Success:      false,
			ErrorMessage: "",
		}
	}

	result := &model.TableMigrationResult{
		TableName: tableName,
		StartTime: time.Now(),
	}

	defer func() {
		result.EndTime = time.Now()
	}()

	s.logger.Info("Starting table migration", zap.String("task_id", taskID), zap.String("table", tableName))

	// 获取表结构
	sourceSchema, err := sourceDS.GetTableSchema(dbName, tableName)
	if err != nil {
		result.Success = false
		result.ErrorMessage = fmt.Sprintf("Failed to get source table schema: %v", err)
		return result
	} else {
		s.logger.Info("sourceSchema", zap.Any("sourceSchema", sourceSchema))
	}

	// 检查目标表是否存在
	tableExists := true
	_, err = targetDS.GetTableSchema(dbName, tableName)
	if err != nil {
		tableExists = false
	}

	if !tableExists {
		if task.CreateSchema {
			s.logger.Info("Target table does not exist, auto create", zap.String("task_id", taskID), zap.String("database", dbName), zap.String("table", tableName))
			if srcMy, ok1 := sourceDS.(*MySQLDataSource); ok1 {
				if tgtMy, ok2 := targetDS.(*MySQLDataSource); ok2 {
					err := tgtMy.CreateTableFromSource(srcMy, dbName, tableName, dbName)
					if err != nil {
						s.logger.Error("Failed to create target table by DDL", zap.String("task_id", taskID), zap.String("table", tableName), zap.String("database", dbName), zap.Error(err))
						result.Success = false
						result.ErrorMessage = fmt.Sprintf("Failed to create target table by DDL: %v", err)
						return result
					}
				}
			}
		} else {
			s.logger.Info("Target table does not exist and create_schema is false", zap.String("task_id", taskID), zap.String("table", tableName))
			result.Success = false
			result.ErrorMessage = "Target table does not exist and create_schema is false"
			return result
		}
	} else {
		// 表已存在
		if task.TruncateTarget {
			s.logger.Info("Truncate target table", zap.String("task_id", taskID), zap.String("table", tableName))
			if err := targetDS.DropTable(dbName, tableName); err != nil {
				result.Success = false
				result.ErrorMessage = fmt.Sprintf("Failed to truncate target table: %v", err)
				return result
			}
			// 重建表结构
			if task.CreateSchema {
				if srcMy, ok1 := sourceDS.(*MySQLDataSource); ok1 {
					if tgtMy, ok2 := targetDS.(*MySQLDataSource); ok2 {
						err := tgtMy.CreateTableFromSource(srcMy, dbName, tableName, dbName)
						if err != nil {
							result.Success = false
							result.ErrorMessage = fmt.Sprintf("Failed to recreate target table by DDL: %v", err)
							return result
						}
					} else {
						if err := targetDS.CreateTable(dbName, sourceSchema); err != nil {
							result.Success = false
							result.ErrorMessage = fmt.Sprintf("Failed to recreate target table: %v", err)
							return result
						}
					}
				} else {
					if err := targetDS.CreateTable(dbName, sourceSchema); err != nil {
						result.Success = false
						result.ErrorMessage = fmt.Sprintf("Failed to recreate target table: %v", err)
						return result
					}
				}
			}
		}
	}

	// 新增：只同步表结构时，建表后直接返回
	if task.OnlySyncSchema {
		result.Success = true
		result.ErrorMessage = ""
		s.logger.Info("OnlySyncSchema enabled, skip data migration", zap.String("task_id", taskID), zap.String("database", dbName), zap.String("table", tableName))
		return result
	}

	// 获取总行数
	totalRows, err := sourceDS.GetRowCount(dbName, tableName)
	if err != nil {
		result.Success = false
		result.ErrorMessage = fmt.Sprintf("Failed to get row count: %v", err)
		return result
	}
	result.TotalRows = totalRows

	// 分批读取和写入数据
	offset := 0
	batchSize := task.BatchSize
	if batchSize <= 0 {
		batchSize = 1000
	}

	for offset < int(totalRows) {
		// 读取数据
		rows, err := sourceDS.ReadRows(dbName, tableName, ReadOptions{
			Offset: offset,
			Limit:  batchSize,
		})
		if err != nil {
			result.Success = false
			result.ErrorMessage = fmt.Sprintf("Failed to read rows: %v", err)
			return result
		}

		if len(rows) == 0 {
			break
		}

		// 写入数据
		err = targetDS.WriteRows(dbName, tableName, rows, WriteOptions{
			BatchSize: batchSize,
		})
		if err != nil {
			result.FailedRows += int64(len(rows))
			s.logger.Error("Failed to write batch",
				zap.String("task_id", taskID),
				zap.String("table", tableName),
				zap.String("database", dbName),
				zap.Int("offset", offset),
				zap.Error(err))
		} else {
			result.MigratedRows += int64(len(rows))
		}

		offset += len(rows)
	}

	result.Success = result.FailedRows == 0
	s.logger.Info("Table migration completed",
		zap.String("task_id", taskID),
		zap.String("table", tableName),
		zap.Int64("total_rows", result.TotalRows),
		zap.Int64("migrated_rows", result.MigratedRows),
		zap.Int64("failed_rows", result.FailedRows))

	return result
}

// updateTaskStatus 更新任务状态
func (s *MigrationService) updateTaskStatus(taskID string, status model.MigrationStatus, errorMessage string) {
	s.taskMutex.Lock()
	if task, exists := s.Tasks[taskID]; exists {
		task.Status = status
		task.ErrorMessage = errorMessage
		if status == model.MigrationStatusCompleted || status == model.MigrationStatusFailed {
			now := time.Now()
			task.EndTime = &now
		}
	}
	s.taskMutex.Unlock()

	// 更新数据库
	updates := map[string]interface{}{
		"status": status,
	}
	if errorMessage != "" {
		updates["error_message"] = errorMessage
	}
	if status == model.MigrationStatusCompleted || status == model.MigrationStatusFailed {
		now := time.Now()
		updates["end_time"] = &now
	}

	if err := s.db.Model(&model.MigrationTask{}).Where("task_id = ?", taskID).Updates(updates).Error; err != nil {
		s.logger.Error("Failed to update task status in database", zap.String("task_id", taskID), zap.Error(err))
	}
}

// updateTaskProgress 更新任务进度
func (s *MigrationService) updateTaskProgress(taskID string, progress float64, totalRows, migratedRows int64, currentTable string) {
	s.taskMutex.Lock()
	if task, exists := s.Tasks[taskID]; exists {
		task.Progress = progress
		task.TotalRows = totalRows
		task.MigratedRows = migratedRows
	}
	s.taskMutex.Unlock()

	// 更新数据库
	if err := s.db.Model(&model.MigrationTask{}).Where("task_id = ?", taskID).Updates(map[string]interface{}{
		"progress":      progress,
		"total_rows":    totalRows,
		"migrated_rows": migratedRows,
	}).Error; err != nil {
		s.logger.Error("Failed to update task progress in database", zap.String("task_id", taskID), zap.Error(err))
	}
}

// GetTaskProgress 获取任务进度
func (s *MigrationService) GetTaskProgress(taskID string) (*model.MigrationProgress, error) {
	s.taskMutex.RLock()
	task, exists := s.Tasks[taskID]
	s.taskMutex.RUnlock()

	if !exists {
		// 从数据库查询
		var dbTask model.MigrationTask
		if err := s.db.Where("task_id = ?", taskID).First(&dbTask).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, coreError.ErrMigrationTaskNotFound
			}
			return nil, fmt.Errorf("failed to get task from database: %w", err)
		}
		task = &dbTask
	}

	progress := &model.MigrationProgress{
		TaskID:       task.TaskID,
		Status:       task.Status,
		Progress:     task.Progress,
		TotalRows:    task.TotalRows,
		MigratedRows: task.MigratedRows,
		FailedRows:   task.FailedRows,
		StartTime:    task.StartTime,
		EndTime:      task.EndTime,
		ErrorMessage: task.ErrorMessage,
	}

	return progress, nil
}

// ListTasks 列出所有任务
func (s *MigrationService) ListTasks() ([]*model.MigrationTask, error) {
	var tasks []*model.MigrationTask
	if err := s.db.Order("created_at DESC").Find(&tasks).Error; err != nil {
		return nil, fmt.Errorf("failed to list tasks: %w", err)
	}
	return tasks, nil
}

// CancelTask 取消任务
func (s *MigrationService) CancelTask(taskID string) error {
	s.taskMutex.Lock()
	task, exists := s.Tasks[taskID]
	if !exists {
		s.taskMutex.Unlock()
		return coreError.ErrMigrationTaskNotFound
	}

	if task.Status != model.MigrationStatusRunning && task.Status != model.MigrationStatusPending {
		s.taskMutex.Unlock()
		return fmt.Errorf("cannot cancel task with status: %s", task.Status)
	}

	task.Status = model.MigrationStatusCancelled
	now := time.Now()
	task.EndTime = &now
	s.taskMutex.Unlock()

	// 更新数据库
	if err := s.db.Model(task).Updates(map[string]interface{}{
		"status":   task.Status,
		"end_time": task.EndTime,
	}).Error; err != nil {
		return fmt.Errorf("failed to update task status: %w", err)
	}

	return nil
}

// CreateMigrationRequest 创建迁移任务请求
type CreateMigrationRequest struct {
	SourceConfig   model.DataSourceConfig `json:"source_config"`
	TargetConfig   model.DataSourceConfig `json:"target_config"`
	Database       string                 `json:"database"`
	Tables         []string               `json:"tables"`
	BatchSize      int                    `json:"batch_size"`
	CreateSchema   bool                   `json:"create_schema"`
	TruncateTarget bool                   `json:"truncate_target"`
	OnlySyncSchema bool                   `json:"only_sync_schema"`
}

// CompareRequest 用于数据对比接口
type CompareRequest struct {
	SourceConfig DataSourceConfig `json:"source_config"`
	TargetConfig DataSourceConfig `json:"target_config"`
	Database     string           `json:"database"`
	Tables       []string         `json:"tables"`
}

// TableCompareResult 单表对比结果
type TableCompareResult struct {
	Table          string `json:"table"`
	ExistsInSource bool   `json:"exists_in_source"`
	ExistsInTarget bool   `json:"exists_in_target"`
	RowCountSource int64  `json:"row_count_source"`
	RowCountTarget int64  `json:"row_count_target"`
}

// CompareResponse 总体对比结果
type CompareResponse struct {
	TableCountEqual  bool                 `json:"table_count_equal"`
	TableCountSource int                  `json:"table_count_source"`
	TableCountTarget int                  `json:"table_count_target"`
	Tables           []TableCompareResult `json:"tables"`
}

// ParseTableName 导出供 API handler 使用
func ParseTableName(table string) (string, string, error) {
	return parseTableName(table)
}
