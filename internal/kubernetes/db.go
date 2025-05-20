package kubernetes

import (
	"fmt"
	"opscore/internal/db"
)

func GetClusterKubeconfigById(clusterId string) ([]byte, error) {
	db := db.DBInstance
	row := db.DB.Raw("SELECT kubeconfig FROM k8s_clusters WHERE cluster_id = ?", clusterId)	

	var kubeconfig []byte
	err := row.Scan(&kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("Failed to get cluster kubeconfig: %v,clusterId :%s", err,clusterId)
	}
	return kubeconfig, nil
}

// GetAllClusters 从数据库中检索所有 K8sClusterMetaData。
func GetAllClusters() ([]K8sClusterMetaData, error) {
	dbInstance := db.DBInstance // 确保 db.DBInstance 已正确初始化
	var clusters []K8sClusterMetaData
	// 使用 GORM 的 Find 方法获取 K8sClusterMetaData 表中的所有记录
	// 假设 K8sClusterMetaData 结构体已正确映射到数据库表名 (例如 "k8s_cluster_meta_data")
	// GORM 会自动根据结构体名推断表名，通常是蛇形复数 (e.g., k8s_cluster_meta_data)
	// 如果表名不同，需要在 K8sClusterMetaData 结构体中通过 TableName() 方法指定
	result := dbInstance.DB.Find(&clusters)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to retrieve clusters from database: %w", result.Error)
	}
	return clusters, nil
}