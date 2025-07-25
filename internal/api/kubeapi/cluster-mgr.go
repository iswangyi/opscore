package kubeapi

import (
	"net/http"
	"opscore/internal/service/kubernetes" // 引入业务逻辑包
	"opscore/internal/log"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	// "time" // 如果 K8sClusterResponse 中的 AddedAt 需要手动设置且不是来自 gorm.Model
)

// AddK8sClusterHandler 处理添加新 Kubernetes 集群的 API 请求。
// 原函数名 AddK8sClusterRoutes 容易误解，已修改。
func AddK8sClusterHandler(c *gin.Context) {
	logger := log.GetLogger()
	var req K8sAddClusterRequest // 使用新的请求结构体

	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("无法绑定添加集群请求的JSON", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求负载: " + err.Error()})
		return
	}

	createdClusterMetadata, err := kubernetes.AddCluster(req.ClusterName, req.Comment, req.KubeConfig)
	if err != nil {
		// 根据错误类型可以返回更具体的HTTP状态码，例如400表示kubeconfig无效，500表示内部错误
		c.JSON(http.StatusInternalServerError, gin.H{"error": "添加集群失败: " + err.Error()})
		return
	}

	// 构建成功的响应
	response := K8sClusterResponse{
		ID:          createdClusterMetadata.ID,        
		ClusterName: createdClusterMetadata.ClusterName,
		Comment:     createdClusterMetadata.Comment,
		ClusterID:   createdClusterMetadata.ClusterID, // 后端生成的唯一字符串ID
		Version:     createdClusterMetadata.Version,
		Status:      createdClusterMetadata.Status,
		AddedAt:     createdClusterMetadata.CreatedAt, // 来自 gorm.Model
	}

	logger.Info("成功添加新的Kubernetes集群", zap.String("clusterName", response.ClusterName), zap.String("clusterID", response.ClusterID))
	c.JSON(http.StatusCreated, response) // 返回 201 Created 状态码
}

// ListK8sClustersHandler 处理列出所有 Kubernetes 集群的 API 请求。
func ListK8sClustersHandler(c *gin.Context) {
	logger := log.GetLogger()

	clusterMetadatas, err := kubernetes.GetAllClusters() 
	if err != nil {
		logger.Error("从数据库获取集群失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检索集群失败: " + err.Error()})
		return
	}

	// 将 K8sClusterMetaData 转换为 K8sClusterResponse
	// K8sClusterResponse 定义在 internal/api/kubernetes-types.go
	responses := make([]K8sClusterResponse, len(clusterMetadatas))
	for i, meta := range clusterMetadatas {
		responses[i] = K8sClusterResponse{
			ID:          meta.ID,        // 来自 gorm.Model
			ClusterName: meta.ClusterName,
			Comment:     meta.Comment,
			ClusterID:   meta.ClusterID, // 后端生成的唯一字符串ID
			Version:     meta.Version,
			Status:      meta.Status,
			AddedAt:     meta.CreatedAt, // 来自 gorm.Model
		}
	}

	logger.Info("成功检索到Kubernetes集群列表", zap.Int("count", len(responses)))
	c.JSON(http.StatusOK, responses)
}

