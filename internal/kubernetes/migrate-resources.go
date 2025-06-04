package kubernetes

import (
	"context"
	"fmt"
	"strings"

	"opscore/internal/log"

	"go.uber.org/zap"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	batchv1beta1 "k8s.io/api/batch/v1beta1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/yaml"
)

// MigrateResult 定义单个资源迁移的结果
type MigrateResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// MigrateResources 将资源从源集群迁移到目标集群
func MigrateResources(sourceClusterID, destClusterID, sourceNamespace, destNamespace string, resourceTypes []string) (map[string]map[string]MigrateResult, error) {
	logger := log.GetLogger()
	logger.Info("开始资源迁移",
		zap.String("sourceClusterID", sourceClusterID),
		zap.String("destClusterID", destClusterID),
		zap.String("sourceNamespace", sourceNamespace),
		zap.String("destNamespace", destNamespace),
		zap.Strings("resourceTypes", resourceTypes))

	// 获取源集群和目标集群的信息
	sourceCluster, err := GetClusterByClusterID(sourceClusterID)
	if err != nil {
		logger.Error("获取源集群信息失败", zap.Error(err))
		return nil, fmt.Errorf("获取源集群信息失败: %v", err)
	}

	destCluster, err := GetClusterByClusterID(destClusterID)
	if err != nil {
		logger.Error("获取目标集群信息失败", zap.Error(err))
		return nil, fmt.Errorf("获取目标集群信息失败: %v", err)
	}

	// 创建源集群和目标集群的客户端
	sourceClient, err := NewK8sClient(sourceCluster.KubeConfig)
	if err != nil {
		logger.Error("创建源集群客户端失败", zap.Error(err))
		return nil, fmt.Errorf("创建源集群客户端失败: %v", err)
	}

	destClient, err := NewK8sClient(destCluster.KubeConfig)
	if err != nil {
		logger.Error("创建目标集群客户端失败", zap.Error(err))
		return nil, fmt.Errorf("创建目标集群客户端失败: %v", err)
	}

	// 如果未指定资源类型，则使用默认资源类型
	if len(resourceTypes) == 0 {
		resourceTypes = []string{
			"deployments", "statefulsets", "services", "configmaps",
			"secrets", "pvcs", "pvs", "cronjobs", "jobs",
		}
	}

	// 存储迁移结果
	results := make(map[string]map[string]MigrateResult)

	// 确保目标命名空间存在
	if err := ensureNamespaceExists(destClient, destNamespace); err != nil {
		logger.Error("确保目标命名空间存在失败", zap.Error(err))
		return nil, fmt.Errorf("确保目标命名空间存在失败: %v", err)
	}

	// 遍历资源类型并迁移
	for _, resourceType := range resourceTypes {
		resourceResults := make(map[string]MigrateResult)
		results[resourceType] = resourceResults

		var resources []runtime.Object
		var resourceNames []string

		switch strings.ToLower(resourceType) {
		case "deployments":
			deployments, err := sourceClient.AppsV1().Deployments(sourceNamespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				logger.Error("获取Deployments失败", zap.Error(err))
				resourceResults["_error"] = MigrateResult{Success: false, Message: fmt.Sprintf("获取Deployments失败: %v", err)}
				continue
			}
			for i := range deployments.Items {
				item := &deployments.Items[i]
				item.APIVersion = "apps/v1"
				item.Kind = "Deployment"
				resources = append(resources, item)
				resourceNames = append(resourceNames, item.Name)
			}

		case "statefulsets":
			statefulsets, err := sourceClient.AppsV1().StatefulSets(sourceNamespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				logger.Error("获取StatefulSets失败", zap.Error(err))
				resourceResults["_error"] = MigrateResult{Success: false, Message: fmt.Sprintf("获取StatefulSets失败: %v", err)}
				continue
			}
			for i := range statefulsets.Items {
				item := &statefulsets.Items[i]
				item.APIVersion = "apps/v1"
				item.Kind = "StatefulSet"
				resources = append(resources, item)
				resourceNames = append(resourceNames, item.Name)
			}

		case "services":
			serviceList, err := sourceClient.CoreV1().Services(sourceNamespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				logger.Error("获取Services失败", zap.Error(err))
				resourceResults["_error"] = MigrateResult{Success: false, Message: fmt.Sprintf("获取Services失败: %v", err)}
				continue
			}
			for i := range serviceList.Items {
				item := &serviceList.Items[i]
				item.APIVersion = "v1"
				item.Kind = "Service"
				item.ManagedFields = nil
				item.Spec.ClusterIP = ""
				item.Spec.ClusterIPs = nil
				item.Spec.ExternalIPs = nil
				item.Spec.ExternalName = ""
				item.Spec.ExternalTrafficPolicy = ""
				item.Spec.HealthCheckNodePort = 0
				item.Spec.LoadBalancerIP = ""
				item.Spec.LoadBalancerSourceRanges = nil
				resources = append(resources, item)
				resourceNames = append(resourceNames, item.Name)
			}

		case "configmaps":
			configMapList, err := sourceClient.CoreV1().ConfigMaps(sourceNamespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				logger.Error("获取ConfigMaps失败", zap.Error(err))
				resourceResults["_error"] = MigrateResult{Success: false, Message: fmt.Sprintf("获取ConfigMaps失败: %v", err)}
				continue
			}
			for i := range configMapList.Items {
				item := &configMapList.Items[i]
				item.APIVersion = "v1"
				item.Kind = "ConfigMap"
				resources = append(resources, item)
				resourceNames = append(resourceNames, item.Name)
			}
		case "secrets":
			secretList, err := sourceClient.CoreV1().Secrets(sourceNamespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				logger.Error("获取Secrets失败", zap.Error(err))
				resourceResults["_error"] = MigrateResult{Success: false, Message: fmt.Sprintf("获取Secrets失败: %v", err)}
				continue
			}
			for i := range secretList.Items {
				item := &secretList.Items[i]
				item.APIVersion = "v1"
				item.Kind = "Secret"
				resources = append(resources, item)
				resourceNames = append(resourceNames, item.Name)
			}

		case "pvcs", "persistentvolumeclaims":
			pvcList, err := sourceClient.CoreV1().PersistentVolumeClaims(sourceNamespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				logger.Error("获取PersistentVolumeClaims失败", zap.Error(err))
				resourceResults["_error"] = MigrateResult{Success: false, Message: fmt.Sprintf("获取PersistentVolumeClaims失败: %v", err)}
				continue
			}
			for i := range pvcList.Items {
				item := &pvcList.Items[i]
				item.APIVersion = "v1"
				item.Kind = "PersistentVolumeClaim"
				resources = append(resources, item)
				resourceNames = append(resourceNames, item.Name)
			}

		case "pvs", "persistentvolumes":
			// PV是集群级资源，不属于特定命名空间
			pvList, err := sourceClient.CoreV1().PersistentVolumes().List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				logger.Error("获取PersistentVolumes失败", zap.Error(err))
				resourceResults["_error"] = MigrateResult{Success: false, Message: fmt.Sprintf("获取PersistentVolumes失败: %v", err)}
				continue
			}
			for i := range pvList.Items {
				item := &pvList.Items[i]
				item.APIVersion = "v1"
				item.Kind = "PersistentVolume"
				resources = append(resources, item)
				resourceNames = append(resourceNames, item.Name)
			}

		case "cronjobs":
			cronjobList, err := sourceClient.BatchV1().CronJobs(sourceNamespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				// 尝试BatchV1beta1 API (针对较旧的Kubernetes版本)
				cronjobBetaList, betaErr := sourceClient.BatchV1beta1().CronJobs(sourceNamespace).List(context.TODO(), metav1.ListOptions{})
				if betaErr != nil {
					logger.Error("获取CronJobs失败", zap.Error(err), zap.Error(betaErr))
					resourceResults["_error"] = MigrateResult{Success: false, Message: fmt.Sprintf("获取CronJobs失败: %v, %v", err, betaErr)}
					continue
				}
				for i := range cronjobBetaList.Items {
					item := &cronjobBetaList.Items[i]
					item.APIVersion = "batch/v1beta1"
					item.Kind = "CronJob"
					resources = append(resources, item)
					resourceNames = append(resourceNames, item.Name)
				}
			} else {
				for i := range cronjobList.Items {
					item := &cronjobList.Items[i]
					item.APIVersion = "batch/v1"
					item.Kind = "CronJob"
					resources = append(resources, item)
					resourceNames = append(resourceNames, item.Name)
				}
			}

		case "jobs":
			jobList, err := sourceClient.BatchV1().Jobs(sourceNamespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				logger.Error("获取Jobs失败", zap.Error(err))
				resourceResults["_error"] = MigrateResult{Success: false, Message: fmt.Sprintf("获取Jobs失败: %v", err)}
				continue
			}
			for i := range jobList.Items {
				item := &jobList.Items[i]
				item.APIVersion = "batch/v1"
				item.Kind = "Job"
				resources = append(resources, item)
				resourceNames = append(resourceNames, item.Name)
			}
		}

		// 清理资源并应用到目标集群
		for i, obj := range resources {
			resourceName := resourceNames[i]

			// 清理不必要的字段
			cleanObject(obj)

			// 将资源应用到目标集群
			err := applyResourceToCluster(destClient, obj, destNamespace)
			if err != nil {
				logger.Error("应用资源到目标集群失败",
					zap.String("resourceType", resourceType),
					zap.String("resourceName", resourceName),
					zap.Error(err))
				resourceResults[resourceName] = MigrateResult{Success: false, Message: err.Error()}
			} else {
				logger.Info("成功应用资源到目标集群",
					zap.String("resourceType", resourceType),
					zap.String("resourceName", resourceName))
				resourceResults[resourceName] = MigrateResult{Success: true, Message: "迁移成功"}
			}
		}

		// 如果没有资源，记录信息
		if len(resources) == 0 && resourceResults["_error"] == (MigrateResult{}) {
			logger.Info("没有找到需要迁移的资源", zap.String("resourceType", resourceType))
			resourceResults["_info"] = MigrateResult{Success: true, Message: "没有找到需要迁移的资源"}
		}
	}

	return results, nil
}

// ensureNamespaceExists 确保目标命名空间存在，如果不存在则创建
func ensureNamespaceExists(client *kubernetes.Clientset, namespaceName string) error {
	// 检查命名空间是否存在
	_, err := client.CoreV1().Namespaces().Get(context.TODO(), namespaceName, metav1.GetOptions{})
	if err == nil {
		// 命名空间已存在
		return nil
	}

	// 如果错误不是"未找到"，则返回错误
	if !errors.IsNotFound(err) {
		return fmt.Errorf("检查命名空间是否存在时出错: %v", err)
	}

	// 创建命名空间
	namespace := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: namespaceName,
		},
	}

	_, err = client.CoreV1().Namespaces().Create(context.TODO(), namespace, metav1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("创建命名空间失败: %v", err)
	}

	return nil
}

// applyResourceToCluster 将资源应用到目标集群
func applyResourceToCluster(client *kubernetes.Clientset, obj runtime.Object, namespace string) error {
	// 将对象转换为YAML
	yamlBytes, err := yaml.Marshal(obj)
	if err != nil {
		return fmt.Errorf("转换资源为YAML失败: %v", err)
	}

	// 解码YAML为动态对象
	decoder := scheme.Codecs.UniversalDeserializer()
	object, _, err := decoder.Decode(yamlBytes, nil, nil)
	if err != nil {
		return fmt.Errorf("解码YAML失败: %v", err)
	}

	// 根据对象类型执行相应的创建或更新操作
	switch o := object.(type) {
	case *appsv1.Deployment:
		// 尝试获取现有的Deployment
		_, err := client.AppsV1().Deployments(namespace).Get(context.TODO(), o.Name, metav1.GetOptions{})
		if err != nil {
			if errors.IsNotFound(err) {
				// 如果不存在，则创建
				_, err = client.AppsV1().Deployments(namespace).Create(context.TODO(), o, metav1.CreateOptions{})
				if err != nil {
					return fmt.Errorf("创建Deployment失败: %v", err)
				}
			} else {
				return fmt.Errorf("获取Deployment失败: %v", err)
			}
		} else {
			// 如果存在，则更新
			_, err = client.AppsV1().Deployments(namespace).Update(context.TODO(), o, metav1.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("更新Deployment失败: %v", err)
			}
		}

	case *appsv1.StatefulSet:
		// 尝试获取现有的StatefulSet
		_, err := client.AppsV1().StatefulSets(namespace).Get(context.TODO(), o.Name, metav1.GetOptions{})
		if err != nil {
			if errors.IsNotFound(err) {
				// 如果不存在，则创建
				_, err = client.AppsV1().StatefulSets(namespace).Create(context.TODO(), o, metav1.CreateOptions{})
				if err != nil {
					return fmt.Errorf("创建StatefulSet失败: %v", err)
				}
			} else {
				return fmt.Errorf("获取StatefulSet失败: %v", err)
			}
		} else {
			// 如果存在，则更新
			_, err = client.AppsV1().StatefulSets(namespace).Update(context.TODO(), o, metav1.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("更新StatefulSet失败: %v", err)
			}
		}

	case *corev1.Service:
		// 尝试获取现有的Service
		_, err := client.CoreV1().Services(namespace).Get(context.TODO(), o.Name, metav1.GetOptions{})
		if err != nil {
			if errors.IsNotFound(err) {
				// 如果不存在，则创建
				_, err = client.CoreV1().Services(namespace).Create(context.TODO(), o, metav1.CreateOptions{})
				if err != nil {
					return fmt.Errorf("创建Service失败: %v", err)
				}
			} else {
				return fmt.Errorf("获取Service失败: %v", err)
			}
		} else {
			// 如果存在，则更新
			_, err = client.CoreV1().Services(namespace).Update(context.TODO(), o, metav1.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("更新Service失败: %v", err)
			}
		}

	case *corev1.Secret:
		// 尝试获取现有的Secret
		_, err := client.CoreV1().Secrets(namespace).Get(context.TODO(), o.Name, metav1.GetOptions{})
		if err != nil {
			if errors.IsNotFound(err) {
				// 如果不存在，则创建
				_, err = client.CoreV1().Secrets(namespace).Create(context.TODO(), o, metav1.CreateOptions{})
				if err != nil {
					return fmt.Errorf("创建Secret失败: %v", err)
				}
			} else {
				return fmt.Errorf("获取Secret失败: %v", err)
			}
		} else {
			// 如果存在，则更新
			_, err = client.CoreV1().Secrets(namespace).Update(context.TODO(), o, metav1.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("更新Secret失败: %v", err)
			}
		}

	case *corev1.PersistentVolumeClaim:
		// 尝试获取现有的PVC
		_, err := client.CoreV1().PersistentVolumeClaims(namespace).Get(context.TODO(), o.Name, metav1.GetOptions{})
		if err != nil {
			if errors.IsNotFound(err) {
				// 如果不存在，则创建
				_, err = client.CoreV1().PersistentVolumeClaims(namespace).Create(context.TODO(), o, metav1.CreateOptions{})
				if err != nil {
					return fmt.Errorf("创建PersistentVolumeClaim失败: %v", err)
				}
			} else {
				return fmt.Errorf("获取PersistentVolumeClaim失败: %v", err)
			}
		} else {
			// PVC不支持更新，需要先删除再创建
			return fmt.Errorf("PersistentVolumeClaim已存在，无法更新，请先删除再创建")
		}

	case *corev1.PersistentVolume:
		// 尝试获取现有的PV
		_, err := client.CoreV1().PersistentVolumes().Get(context.TODO(), o.Name, metav1.GetOptions{})
		if err != nil {
			if errors.IsNotFound(err) {
				// 如果不存在，则创建
				_, err = client.CoreV1().PersistentVolumes().Create(context.TODO(), o, metav1.CreateOptions{})
				if err != nil {
					return fmt.Errorf("创建PersistentVolume失败: %v", err)
				}
			} else {
				return fmt.Errorf("获取PersistentVolume失败: %v", err)
			}
		} else {
			// PV不支持更新，需要先删除再创建
			return fmt.Errorf("PersistentVolume已存在，无法更新，请先删除再创建")
		}

	case *batchv1.CronJob:
		// 尝试获取现有的CronJob
		_, err := client.BatchV1().CronJobs(namespace).Get(context.TODO(), o.Name, metav1.GetOptions{})
		if err != nil {
			if errors.IsNotFound(err) {
				// 如果不存在，则创建
				_, err = client.BatchV1().CronJobs(namespace).Create(context.TODO(), o, metav1.CreateOptions{})
				if err != nil {
					return fmt.Errorf("创建CronJob失败: %v", err)
				}
			} else {
				return fmt.Errorf("获取CronJob失败: %v", err)
			}
		} else {
			// 如果存在，则更新
			_, err = client.BatchV1().CronJobs(namespace).Update(context.TODO(), o, metav1.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("更新CronJob失败: %v", err)
			}
		}

	case *batchv1beta1.CronJob:
		// 尝试获取现有的CronJob (v1beta1)
		_, err := client.BatchV1beta1().CronJobs(namespace).Get(context.TODO(), o.Name, metav1.GetOptions{})
		if err != nil {
			if errors.IsNotFound(err) {
				// 如果不存在，则创建
				_, err = client.BatchV1beta1().CronJobs(namespace).Create(context.TODO(), o, metav1.CreateOptions{})
				if err != nil {
					return fmt.Errorf("创建CronJob (v1beta1)失败: %v", err)
				}
			} else {
				return fmt.Errorf("获取CronJob (v1beta1)失败: %v", err)
			}
		} else {
			// 如果存在，则更新
			_, err = client.BatchV1beta1().CronJobs(namespace).Update(context.TODO(), o, metav1.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("更新CronJob (v1beta1)失败: %v", err)
			}
		}

	case *batchv1.Job:
		// 尝试获取现有的Job
		_, err := client.BatchV1().Jobs(namespace).Get(context.TODO(), o.Name, metav1.GetOptions{})
		if err != nil {
			if errors.IsNotFound(err) {
				// 如果不存在，则创建
				_, err = client.BatchV1().Jobs(namespace).Create(context.TODO(), o, metav1.CreateOptions{})
				if err != nil {
					return fmt.Errorf("创建Job失败: %v", err)
				}
			} else {
				return fmt.Errorf("获取Job失败: %v", err)
			}
		} else {
			// Job不支持更新，需要先删除再创建
			return fmt.Errorf("Job已存在，无法更新，请先删除再创建")
		}

	default:
		return fmt.Errorf("不支持的资源类型: %T", o)
	}

	return nil
}
