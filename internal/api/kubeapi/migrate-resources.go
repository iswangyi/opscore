package api

import (
	"net/http"
	"opscore/internal/kubernetes"
	"opscore/internal/log"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// MigrateResourcesRequest 定义资源迁移的请求结构
type MigrateResourcesRequest struct {
	SourceClusterID      string   `json:"sourceClusterId" binding:"required"`
	DestinationClusterID string   `json:"destinationClusterId" binding:"required"`
	SourceNamespace      string   `json:"sourceNamespace" binding:"required"`
	DestNamespace        string   `json:"destNamespace" binding:"required"`
	ResourceTypes        []string `json:"resourceTypes"`
}

// MigrateResourcesResponse 定义资源迁移的响应结构
type MigrateResourcesResponse struct {
	Code int                                            `json:"code"`
	Msg  string                                         `json:"msg"`
	Data map[string]map[string]kubernetes.MigrateResult `json:"data"`
}

// MigrateResult 定义单个资源迁移的结果
type MigrateResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// MigrateResourcesHandler 处理资源迁移的API请求
func MigrateResourcesHandler(c *gin.Context) {
	logger := log.GetLogger()
	var req MigrateResourcesRequest
	var resp MigrateResourcesResponse

	// 解析请求JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("MigrateResourcesHandler: 无法解析请求JSON", zap.Error(err))
		resp = MigrateResourcesResponse{Code: 1, Msg: err.Error(), Data: nil}
		c.JSON(http.StatusBadRequest, resp)
		return
	}

	logger.Info("MigrateResourcesHandler: 开始处理资源迁移请求",
		zap.String("sourceClusterId", req.SourceClusterID),
		zap.String("destinationClusterId", req.DestinationClusterID),
		zap.String("sourceNamespace", req.SourceNamespace),
		zap.String("destNamespace", req.DestNamespace),
		zap.Strings("resourceTypes", req.ResourceTypes))

	// 调用业务逻辑层执行资源迁移
	results, err := kubernetes.MigrateResources(
		req.SourceClusterID,
		req.DestinationClusterID,
		req.SourceNamespace,
		req.DestNamespace,
		req.ResourceTypes,
	)

	if err != nil {
		logger.Error("MigrateResourcesHandler: 资源迁移失败", zap.Error(err))
		resp = MigrateResourcesResponse{Code: 1, Msg: err.Error(), Data: nil}
		c.JSON(http.StatusInternalServerError, resp)
		return
	}

	// 构建成功响应
	resp = MigrateResourcesResponse{Code: 0, Msg: "success", Data: results}
	c.JSON(http.StatusOK, resp)
	return
}
