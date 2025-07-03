package datamigrate

import (
	"net/http"
	"strconv"

	"opscore/internal/log"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// APIHandler 数据迁移API处理器
type APIHandler struct {
	service *MigrationService
	logger  *zap.Logger
}

// NewAPIHandler 创建API处理器
func NewAPIHandler() *APIHandler {
	return &APIHandler{
		service: NewMigrationService(),
		logger:  log.GetLogger(),
	}
}

// CreateMigrationTaskHandler 创建迁移任务
func (h *APIHandler) CreateMigrationTaskHandler(c *gin.Context) {
	var req CreateMigrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind JSON", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 1,
			"msg":  "Invalid request body: " + err.Error(),
		})
		return
	}

	// 验证请求参数
	if err := h.validateCreateRequest(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 1,
			"msg":  err.Error(),
		})
		return
	}

	// 创建迁移任务
	task, err := h.service.CreateMigrationTask(&req)
	if err != nil {
		h.logger.Error("Failed to create migration task", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 1,
			"msg":  "Failed to create migration task: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "success",
		"data": gin.H{
			"task_id": task.TaskID,
			"status":  task.Status,
		},
	})
}

// StartMigrationHandler 开始迁移任务
func (h *APIHandler) StartMigrationHandler(c *gin.Context) {
	taskID := c.Param("taskId")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 1,
			"msg":  "Task ID is required",
		})
		return
	}

	err := h.service.StartMigration(taskID)
	if err != nil {
		h.logger.Error("Failed to start migration", zap.String("task_id", taskID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 1,
			"msg":  "Failed to start migration: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "Migration started successfully",
	})
}

// GetTaskProgressHandler 获取任务进度
func (h *APIHandler) GetTaskProgressHandler(c *gin.Context) {
	taskID := c.Param("taskId")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 1,
			"msg":  "Task ID is required",
		})
		return
	}

	progress, err := h.service.GetTaskProgress(taskID)
	if err != nil {
		h.logger.Error("Failed to get task progress", zap.String("task_id", taskID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 1,
			"msg":  "Failed to get task progress: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "success",
		"data": progress,
	})
}

// ListTasksHandler 列出所有任务
func (h *APIHandler) ListTasksHandler(c *gin.Context) {
	// 获取分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	tasks, err := h.service.ListTasks()
	if err != nil {
		h.logger.Error("Failed to list tasks", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 1,
			"msg":  "Failed to list tasks: " + err.Error(),
		})
		return
	}

	// 简单的分页处理
	total := len(tasks)
	start := (page - 1) * pageSize
	end := start + pageSize

	if start >= total {
		start = total
	}
	if end > total {
		end = total
	}

	var pageTasks []*MigrationTask
	if start < total {
		pageTasks = tasks[start:end]
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "success",
		"data": gin.H{
			"tasks":      pageTasks,
			"total":      total,
			"page":       page,
			"page_size":  pageSize,
			"total_page": (total + pageSize - 1) / pageSize,
		},
	})
}

// CancelTaskHandler 取消任务
func (h *APIHandler) CancelTaskHandler(c *gin.Context) {
	taskID := c.Param("taskId")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 1,
			"msg":  "Task ID is required",
		})
		return
	}

	err := h.service.CancelTask(taskID)
	if err != nil {
		h.logger.Error("Failed to cancel task", zap.String("task_id", taskID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 1,
			"msg":  "Failed to cancel task: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "Task cancelled successfully",
	})
}

// TestConnectionHandler 测试数据源连接
func (h *APIHandler) TestConnectionHandler(c *gin.Context) {
	var config DataSourceConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		h.logger.Error("Failed to bind JSON", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 1,
			"msg":  "Invalid request body: " + err.Error(),
		})
		return
	}

	// 创建数据源
	ds, err := h.service.factory.NewDataSource(config.Type)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 1,
			"msg":  "Unsupported data source type: " + config.Type,
		})
		return
	}
	defer ds.Close()

	// 测试连接
	if err := ds.Connect(config); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"code": 1,
			"msg":  "Connection failed: " + err.Error(),
		})
		return
	}

	if err := ds.TestConnection(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"code": 1,
			"msg":  "Connection test failed: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "Connection test successful",
	})
}

// ListDatabasesHandler 列出数据库
func (h *APIHandler) ListDatabasesHandler(c *gin.Context) {
	var config DataSourceConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		h.logger.Error("Failed to bind JSON", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 1,
			"msg":  "Invalid request body: " + err.Error(),
		})
		return
	}

	// 创建数据源
	ds, err := h.service.factory.NewDataSource(config.Type)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 1,
			"msg":  "Unsupported data source type: " + config.Type,
		})
		return
	}
	defer ds.Close()

	// 连接数据源
	if err := ds.Connect(config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 1,
			"msg":  "Failed to connect: " + err.Error(),
		})
		return
	}

	// 列出数据库
	databases, err := ds.ListDatabases()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 1,
			"msg":  "Failed to list databases: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "success",
		"data": databases,
	})
}

// ListTablesHandler 列出表
func (h *APIHandler) ListTablesHandler(c *gin.Context) {
	var req struct {
		DataSourceConfig `json:"config"`
		Database         string `json:"database"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind JSON", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 1,
			"msg":  "Invalid request body: " + err.Error(),
		})
		return
	}

	if req.Database == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 1,
			"msg":  "Database name is required",
		})
		return
	}

	// 创建数据源
	ds, err := h.service.factory.NewDataSource(req.Type)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 1,
			"msg":  "Unsupported data source type: " + req.Type,
		})
		return
	}
	defer ds.Close()

	// 连接数据源
	if err := ds.Connect(req.DataSourceConfig); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 1,
			"msg":  "Failed to connect: " + err.Error(),
		})
		return
	}

	// 列出表
	tables, err := ds.ListTables(req.Database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 1,
			"msg":  "Failed to list tables: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "success",
		"data": tables,
	})
}

// validateCreateRequest 验证创建请求
func (h *APIHandler) validateCreateRequest(req *CreateMigrationRequest) error {
	if req.SourceConfig.Type == "" {
		return ErrInvalidConfig
	}
	if req.TargetConfig.Type == "" {
		return ErrInvalidConfig
	}
	if req.Database == "" {
		return ErrInvalidConfig
	}
	if req.BatchSize <= 0 {
		req.BatchSize = 1000 // 默认批量大小
	}
	return nil
}
