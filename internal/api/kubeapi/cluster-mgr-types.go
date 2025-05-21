package api

import (
	"time" 
)

// K8sAddClusterRequest 代表添加新 Kubernetes 集群的请求负载。
type K8sAddClusterRequest struct {
	ClusterName string `json:"cluster_name" binding:"required"`
	Comment     string `json:"comment,omitempty"` // 可选的描述信息
	KubeConfig  string `json:"kube_config" binding:"required"`
	// ClusterType string `json:"cluster_type,omitempty"` // 如果需要用户定义的类型，可以添加
}

// K8sClusterResponse 代表成功添加或获取集群后返回的数据。
// 这个结构参考了 web/lib/api.js 中的 mock 数据。
type K8sClusterResponse struct {
	ID          uint      `json:"id"`           // 数据库主键 ID (来自 gorm.Model)
	ClusterName string    `json:"cluster_name"` // 集群名称
	Comment     string    `json:"comment"`      // 备注/描述
	ClusterID   string    `json:"cluster_id"`   // 后端生成的唯一字符串ID (例如 UUID)
	Version     string    `json:"version"`      // Kubernetes 版本
	Status      string    `json:"status"`       // 集群状态 (例如 "connected", "error")
	AddedAt     time.Time `json:"added_at"`     // 添加时间 (来自 gorm.Model.CreatedAt)
	// ClusterType string `json:"cluster_type,omitempty"`
}

// K8sClusterRequestList 结构保持，但其内部类型更新为新的请求类型。
// 如果用于批量添加，其字段应为 []K8sAddClusterRequest。
type K8sClusterRequestList struct {
	Clusters []K8sAddClusterRequest `json:"clusters"`
}









