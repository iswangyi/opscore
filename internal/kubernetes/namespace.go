package kubernetes

import (
	"context"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"opscore/internal/db"
	"opscore/internal/log"
	"go.uber.org/zap"
)


func ListNamespace(clusterID string) ( []string,error) {
	c,err := GetClusterByClusterID(clusterID)
	if err!= nil {
		return nil,err
	}
	var namespaces []string
	client, err := NewK8sClient(c.KubeConfig)
	if err != nil {
		return namespaces,err
	}
	// 调用 Kubernetes API 获取 Namespace 列表
	namespaceList, err := client.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return namespaces,err
	}
	// 处理 Namespace 列表
	for _, namespace := range namespaceList.Items {
		namespaces = append(namespaces, namespace.Name)
	}	
	return namespaces,nil
}

func GetClusterByClusterID(clusterID string) (*K8sClusterMetaData,error) {
	logger := log.GetLogger()
	var cluster K8sClusterMetaData
	db := db.DBInstance
	err := db.Where("id = ?", clusterID).First(&cluster).Error
	if err!= nil {
		logger.Error("获取集群信息失败", zap.Error(err))
		return nil,err
	}
	return &cluster,nil
}