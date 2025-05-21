package kubernetes // or the package where K8sClusterMetaData is defined

import "gorm.io/gorm"

// K8sClusterMetaData 定义了存储在数据库中的Kubernetes集群元数据。
type K8sClusterMetaData struct {
	gorm.Model                    // 包含 ID, CreatedAt, UpdatedAt, DeletedAt
	ClusterName string `json:"cluster_name"`
	Comment     string `json:"comment"`
	KubeConfig  string `json:"kube_config" gorm:"type:text"`    // 使用text类型存储可能较长的kubeconfig
	ClusterID   string `json:"cluster_id" gorm:"uniqueIndex"` // 唯一字符串ID，例如UUID，并建立唯一索引
	Version     string `json:"version"`                       // Kubernetes版本
	Status      string `json:"status"`                        // 集群状态，例如 "connected", "error"
}
