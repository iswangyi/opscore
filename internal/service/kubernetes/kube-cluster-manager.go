package kubernetes

import (
	"context"
	"opscore/internal/db"
	"opscore/internal/log"
	// "time" // gorm.Model 会自动处理 CreatedAt

	"github.com/google/uuid" // 用于生成唯一的 ClusterID
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd" // <-- 添加这个导入
	"opscore/internal/model"
)


// NewK8sClient 根据提供的 kubeconfig 字符串创建一个新的 Kubernetes Clientset。
func NewK8sClient(kubeconfigData string) (*kubernetes.Clientset, error) {
	logger := log.GetLogger() // 获取日志记录器实例
	logger.Info("开始创建 Kubernetes Clientset")
	

	// 将 kubeconfig 字符串转换为字节数组
	kubeconfigBytes := []byte(kubeconfigData)

	// 从 kubeconfig 字节中构建 REST 客户端配置
	config, err := clientcmd.RESTConfigFromKubeConfig(kubeconfigBytes)
	if err != nil {
		logger.Error("无法从 kubeconfig 数据构建 REST 配置", zap.Error(err))
		return nil, err
	}

	// 根据配置创建 Kubernetes Clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		logger.Error("无法根据 REST 配置创建 Kubernetes Clientset", zap.Error(err))
		return nil, err
	}

	logger.Info("成功创建 Kubernetes Clientset")
	return clientset, nil
}

// AddCluster 添加集群，测试连接，获取版本，并保存元数据。
// 参数更新为 clusterName, comment, kubeconfig。
// 返回创建的 K8sClusterMetaData 对象指针和错误。
func AddCluster(clusterName, comment, kubeconfig string) (*model.K8sClusterMetaData, error) {
	logger := log.GetLogger()

	// 1. 创建 Kubernetes 客户端
	client, err := NewK8sClient(kubeconfig) // 假设 NewK8sClient 函数已存在
	if err != nil {
		logger.Error("创建Kubernetes客户端失败", zap.Error(err), zap.String("clusterName", clusterName))
		return nil, err
	}
	logger.Info("Kubernetes客户端创建成功", zap.String("clusterName", clusterName))

	// 2. 测试集群连通性并获取版本信息
	clusterVersion, err := TestAndGetClusterVersion(client) // 使用新的测试函数
	if err != nil {
		// TestAndGetClusterVersion 内部会记录错误
		logger.Error("集群连接测试或获取版本失败", zap.Error(err), zap.String("clusterName", clusterName))
		return nil, err
	}
	logger.Info("集群连接测试成功", zap.String("clusterName", clusterName), zap.String("version", clusterVersion))

	// 3. 准备要存入数据库的集群元数据
	// K8sClusterMetaData 结构体需要确保已更新以包含这些字段
	clusterData := model.K8sClusterMetaData{
		// gorm.Model 会自动填充 ID, CreatedAt, UpdatedAt, DeletedAt
		ClusterName: clusterName,
		Comment:     comment,
		KubeConfig:  kubeconfig,
		ClusterID:   uuid.New().String(), // 生成一个唯一的字符串ID
		Version:     clusterVersion,
		Status:      "connected",         // 如果测试通过，状态为 "connected"
	}

	dbInstance := db.DBInstance
	if err := dbInstance.DB.Create(&clusterData).Error; err != nil {
		logger.Error("保存集群元数据到数据库失败", zap.Error(err), zap.String("clusterName", clusterName))
		return nil, err
	}

	logger.Info("成功添加并验证集群，元数据已保存至数据库。",
		zap.String("clusterName", clusterData.ClusterName),
		zap.String("clusterID", clusterData.ClusterID))
	return &clusterData, nil
}

// TestAndGetClusterVersion 测试集群连通性并获取 Kubernetes 服务端版本。
// 原 TestAddCluster 功能已增强并重命名。
func TestAndGetClusterVersion(client *kubernetes.Clientset) (string, error) {
	logger := log.GetLogger()
	logger.Info("尝试测试集群连通性并获取版本")

	// 通过简单API调用测试连通性 (例如，列出命名空间)
	// _, err := client.CoreV1().Pods("default").List(context.TODO(), metav1.ListOptions{Limit: 1})
	_, err := client.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{Limit: 1})
	if err != nil {
		logger.Error("连接到Kubernetes集群失败 (尝试列出命名空间时)", zap.Error(err))
		return "", err
	}

	// 获取 Kubernetes 服务端版本
	serverVersion, err := client.Discovery().ServerVersion()
	if err != nil {
		logger.Warn("获取Kubernetes服务端版本失败", zap.Error(err))
		// 如果获取版本失败，但基础连接测试成功，可以考虑返回 "unknown" 或仍返回错误
		return "unknown", err // 或者: return "", err
	}

	logger.Info("成功连接并获取服务端版本。", zap.String("version", serverVersion.GitVersion))
	return serverVersion.GitVersion, nil
}





