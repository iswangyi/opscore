package api

import (
	"opscore/internal/kubernetes"
	"opscore/internal/log"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"net/http"
)

// ListK8sClustersHandler 处理列出所有 Kubernetes 集群的 API 请求。
func GetNamespaces(c *gin.Context) {
	var resp ListNamespaceResponse 
	logger := log.GetLogger()
	logger.Info("ListK8sClustersHandler")
	// 从请求上下文中获取集群ID
	clusterID := c.Param("clusterID")
	logger.Info("clusterID", zap.String("clusterID", clusterID))
	// 从数据库中获取集群信息
	data, err := kubernetes.ListNamespace(clusterID)
	if err != nil {
		logger.Error("ListK8sClustersHandler", zap.Error(err))
		resp = ListNamespaceResponse{
			Code:    1,
			Msg: "获取集群信息失败",
			Data:    nil,
		}
		c.JSON(http.StatusInternalServerError, resp) // 500 Internal Server Error
		return
	}
	logger.Info("ListK8sClustersHandler", zap.Any("data", data))
	resp = ListNamespaceResponse{
		Code:    0,
		Msg: "获取集群信息成功",
		Data:  data,  
	}
	c.JSON(http.StatusOK, resp) // 200 OK
	
}