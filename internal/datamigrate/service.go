package datamigrate

import (
	"fmt"
	"sync"
	"time"

	"opscore/internal/db"
	"opscore/internal/log"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// MigrationService 迁移服务
type MigrationService struct {
	db        *gorm.DB
	logger    *zap.Logger
	tasks     map[string]*MigrationTask
	taskMutex sync.RWMutex
	factory   *DataSourceFactory
}

// NewMigrationService 创建迁移服务实例
func NewMigrationService() *MigrationService {
	return &MigrationService{
		db:      db.DBInstance.DB,
		logger:  log.GetLogger(),
		tasks:   make(map[string]*MigrationTask),
		factory: &DataSourceFactory{},
	}
}

// CreateMigrationTask 创建迁移任务
func (s *MigrationService) CreateMigrationTask(req *CreateMigrationRequest) (*MigrationTask, error) {
	// 生成任务ID
	taskID := uuid.New().String()

	// 创建任务
	task := &MigrationTask{
		TaskID:         taskID,
		SourceConfig:   req.SourceConfig,
		TargetConfig:   req.TargetConfig,
		Database:       req.Database,
		Tables:         req.Tables,
		Status:         MigrationStatusPending,
		Progress:       0,
		BatchSize:      req.BatchSize,
		CreateSchema:   req.CreateSchema,
		TruncateTarget: req.TruncateTarget,
	}

	// 保存到数据库
	if err := s.db.Create(task).Error; err != nil {
		return nil, fmt.Errorf("failed to create migration task: %w", err)
	}

	// 添加到内存任务列表
	s.taskMutex.Lock()
	s.tasks[taskID] = task
	s.taskMutex.Unlock()

	s.logger.Info("Created migration task", zap.String("task_id", taskID))
	return task, nil
}

// StartMigration 开始迁移任务
func (s *MigrationService) StartMigration(taskID string) error {
	s.taskMutex.Lock()
	task, exists := s.tasks[taskID]
	if !exists {
		s.taskMutex.Unlock()
		return ErrMigrationTaskNotFound
	}

	if task.Status == MigrationStatusRunning {
		s.taskMutex.Unlock()
		return ErrMigrationTaskRunning
	}

	if task.Status == MigrationStatusCompleted {
		s.taskMutex.Unlock()
		return ErrMigrationTaskCompleted
	}

	task.Status = MigrationStatusRunning
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
	task := s.tasks[taskID]
	s.taskMutex.RUnlock()

	defer func() {
		if r := recover(); r != nil {
			s.logger.Error("Migration task panicked", zap.String("task_id", taskID), zap.Any("panic", r))
			s.updateTaskStatus(taskID, MigrationStatusFailed, fmt.Sprintf("Task panicked: %v", r))
		}
	}()

	s.logger.Info("Starting migration task", zap.String("task_id", taskID))

	// 创建源和目标数据源
	sourceDS, err := s.factory.NewDataSource(task.SourceConfig.Type)
	if err != nil {
		s.updateTaskStatus(taskID, MigrationStatusFailed, fmt.Sprintf("Failed to create source data source: %v", err))
		return
	}
	defer sourceDS.Close()

	targetDS, err := s.factory.NewDataSource(task.TargetConfig.Type)
	if err != nil {
		s.updateTaskStatus(taskID, MigrationStatusFailed, fmt.Sprintf("Failed to create target data source: %v", err))
		return
	}
	defer targetDS.Close()

	// 连接数据源
	if err := sourceDS.Connect(task.SourceConfig); err != nil {
		s.updateTaskStatus(taskID, MigrationStatusFailed, fmt.Sprintf("Failed to connect source: %v", err))
		return
	}

	if err := targetDS.Connect(task.TargetConfig); err != nil {
		s.updateTaskStatus(taskID, MigrationStatusFailed, fmt.Sprintf("Failed to connect target: %v", err))
		return
	}

	// 测试连接
	if err := sourceDS.TestConnection(); err != nil {
		s.updateTaskStatus(taskID, MigrationStatusFailed, fmt.Sprintf("Source connection test failed: %v", err))
		return
	}

	if err := targetDS.TestConnection(); err != nil {
		s.updateTaskStatus(taskID, MigrationStatusFailed, fmt.Sprintf("Target connection test failed: %v", err))
		return
	}

	// 获取要迁移的表列表
	tables := task.Tables
	if len(tables) == 0 {
		// 如果未指定表，则迁移所有表
		tables, err = sourceDS.ListTables(task.Database)
		if err != nil {
			s.updateTaskStatus(taskID, MigrationStatusFailed, fmt.Sprintf("Failed to list tables: %v", err))
			return
		}
	}

	// 计算总行数
	var totalRows int64
	for _, table := range tables {
		count, err := sourceDS.GetRowCount(task.Database, table)
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
		s.updateTaskProgress(taskID, float64(i)/float64(len(tables))*100, totalRows, migratedRows, table)

		tableResult := s.migrateTable(taskID, sourceDS, targetDS, task, table)
		migratedRows += tableResult.MigratedRows
		failedRows += tableResult.FailedRows

		if !tableResult.Success {
			s.logger.Error("Table migration failed",
				zap.String("task_id", taskID),
				zap.String("table", table),
				zap.String("error", tableResult.ErrorMessage))
		}
	}

	// 完成迁移
	s.updateTaskProgress(taskID, 100, totalRows, migratedRows, "")
	s.updateTaskStatus(taskID, MigrationStatusCompleted, "")

	s.logger.Info("Migration task completed",
		zap.String("task_id", taskID),
		zap.Int64("total_rows", totalRows),
		zap.Int64("migrated_rows", migratedRows),
		zap.Int64("failed_rows", failedRows))
}

// migrateTable 迁移单个表
func (s *MigrationService) migrateTable(taskID string, sourceDS, targetDS DataSource, task *MigrationTask, tableName string) *TableMigrationResult {
	result := &TableMigrationResult{
		TableName: tableName,
		StartTime: time.Now(),
	}

	defer func() {
		result.EndTime = time.Now()
	}()

	s.logger.Info("Starting table migration", zap.String("task_id", taskID), zap.String("table", tableName))

	// 获取表结构
	sourceSchema, err := sourceDS.GetTableSchema(task.Database, tableName)
	if err != nil {
		result.Success = false
		result.ErrorMessage = fmt.Sprintf("Failed to get source table schema: %v", err)
		return result
	}

	// 检查目标表是否存在
	_, err = targetDS.GetTableSchema(task.TargetConfig.Database, tableName)
	if err != nil {
		if task.CreateSchema {
			// 创建表结构
			if err := targetDS.CreateTable(task.TargetConfig.Database, sourceSchema); err != nil {
				result.Success = false
				result.ErrorMessage = fmt.Sprintf("Failed to create target table: %v", err)
				return result
			}
		} else {
			result.Success = false
			result.ErrorMessage = fmt.Sprintf("Target table does not exist and create_schema is false")
			return result
		}
	} else if task.TruncateTarget {
		// 清空目标表
		if err := targetDS.DropTable(task.TargetConfig.Database, tableName); err != nil {
			result.Success = false
			result.ErrorMessage = fmt.Sprintf("Failed to truncate target table: %v", err)
			return result
		}

		if err := targetDS.CreateTable(task.TargetConfig.Database, sourceSchema); err != nil {
			result.Success = false
			result.ErrorMessage = fmt.Sprintf("Failed to recreate target table: %v", err)
			return result
		}
	}

	// 获取总行数
	totalRows, err := sourceDS.GetRowCount(task.Database, tableName)
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
		rows, err := sourceDS.ReadRows(task.Database, tableName, ReadOptions{
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
		err = targetDS.WriteRows(task.TargetConfig.Database, tableName, rows, WriteOptions{
			BatchSize: batchSize,
		})
		if err != nil {
			result.FailedRows += int64(len(rows))
			s.logger.Error("Failed to write batch",
				zap.String("task_id", taskID),
				zap.String("table", tableName),
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
func (s *MigrationService) updateTaskStatus(taskID string, status MigrationStatus, errorMessage string) {
	s.taskMutex.Lock()
	if task, exists := s.tasks[taskID]; exists {
		task.Status = status
		task.ErrorMessage = errorMessage
		if status == MigrationStatusCompleted || status == MigrationStatusFailed {
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
	if status == MigrationStatusCompleted || status == MigrationStatusFailed {
		now := time.Now()
		updates["end_time"] = &now
	}

	if err := s.db.Model(&MigrationTask{}).Where("task_id = ?", taskID).Updates(updates).Error; err != nil {
		s.logger.Error("Failed to update task status in database", zap.String("task_id", taskID), zap.Error(err))
	}
}

// updateTaskProgress 更新任务进度
func (s *MigrationService) updateTaskProgress(taskID string, progress float64, totalRows, migratedRows int64, currentTable string) {
	s.taskMutex.Lock()
	if task, exists := s.tasks[taskID]; exists {
		task.Progress = progress
		task.TotalRows = totalRows
		task.MigratedRows = migratedRows
	}
	s.taskMutex.Unlock()

	// 更新数据库
	if err := s.db.Model(&MigrationTask{}).Where("task_id = ?", taskID).Updates(map[string]interface{}{
		"progress":      progress,
		"total_rows":    totalRows,
		"migrated_rows": migratedRows,
	}).Error; err != nil {
		s.logger.Error("Failed to update task progress in database", zap.String("task_id", taskID), zap.Error(err))
	}
}

// GetTaskProgress 获取任务进度
func (s *MigrationService) GetTaskProgress(taskID string) (*MigrationProgress, error) {
	s.taskMutex.RLock()
	task, exists := s.tasks[taskID]
	s.taskMutex.RUnlock()

	if !exists {
		// 从数据库查询
		var dbTask MigrationTask
		if err := s.db.Where("task_id = ?", taskID).First(&dbTask).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, ErrMigrationTaskNotFound
			}
			return nil, fmt.Errorf("failed to get task from database: %w", err)
		}
		task = &dbTask
	}

	progress := &MigrationProgress{
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
func (s *MigrationService) ListTasks() ([]*MigrationTask, error) {
	var tasks []*MigrationTask
	if err := s.db.Order("created_at DESC").Find(&tasks).Error; err != nil {
		return nil, fmt.Errorf("failed to list tasks: %w", err)
	}
	return tasks, nil
}

// CancelTask 取消任务
func (s *MigrationService) CancelTask(taskID string) error {
	s.taskMutex.Lock()
	task, exists := s.tasks[taskID]
	if !exists {
		s.taskMutex.Unlock()
		return ErrMigrationTaskNotFound
	}

	if task.Status != MigrationStatusRunning && task.Status != MigrationStatusPending {
		s.taskMutex.Unlock()
		return fmt.Errorf("cannot cancel task with status: %s", task.Status)
	}

	task.Status = MigrationStatusCancelled
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
	SourceConfig   DataSourceConfig `json:"source_config"`
	TargetConfig   DataSourceConfig `json:"target_config"`
	Database       string           `json:"database"`
	Tables         []string         `json:"tables"`
	BatchSize      int              `json:"batch_size"`
	CreateSchema   bool             `json:"create_schema"`
	TruncateTarget bool             `json:"truncate_target"`
}
