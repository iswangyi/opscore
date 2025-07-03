package kubernetes

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"opscore/internal/log"

	"go.uber.org/zap"
	appsv1 "k8s.io/api/apps/v1" // <-- 添加或修改为此
	batchv1 "k8s.io/api/batch/v1" // <-- 添加
	batchv1beta1 "k8s.io/api/batch/v1beta1" // <-- 添加 (如果需要处理旧版CronJob)
	corev1 "k8s.io/api/core/v1" // <-- 添加
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/yaml"
)

// ExportResourcesRequest 定义导出资源的请求结构
type ExportResourcesRequest struct {
	ResourceTypes []string `json:"resourceTypes"`
}

// ExportResourcesResponse 定义导出资源的响应结构
type ExportResourcesResponse struct {
	YAML string `json:"yaml"`
}

// ExportResources 导出指定命名空间中的资源为YAML格式
func ExportResources(id , namespace string, resourceTypes []string) ([]byte, error) {
	logger := log.GetLogger()
	logger.Info("ExportResources", zap.String("namespace", namespace),
	 zap.String("resourceTypes", strings.Join(resourceTypes, ",")), zap.String("result", "start"),
	 zap.String("cluster_id", id))

	var buffer bytes.Buffer
	c,err := GetClusterByClusterID(id)
	if err!= nil {
		return nil,err
	}
	clientset, err := NewK8sClient(c.KubeConfig)
	if err!= nil {
		logger.Error("ExportResources", zap.Error(err))
		return nil, fmt.Errorf("获取Kubernetes客户端失败: %v", err)
	}

	// 如果未指定资源类型，则使用默认资源类型
	if len(resourceTypes) == 0 {
		resourceTypes = []string{
			"deployments", "statefulsets", "services", "configmaps" ,
			"secrets", "pvcs", "pvs", "cronjobs", "jobs",
		}
	}

	// 遍历资源类型并导出
	for _, resourceType := range resourceTypes {
		var resources []runtime.Object
		switch strings.ToLower(resourceType) {
		case "deployments":
			deployments, err := clientset.AppsV1().Deployments(namespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				return nil, fmt.Errorf("获取Deployments失败: %v", err)
			}
			for i := range deployments.Items {
				item := &deployments.Items[i]
				item.APIVersion = "apps/v1"
				item.Kind = "Deployment"
				resources = append(resources, item)
				// 此处的注释可以移除，因为 cleanObject 会处理 status
			}


		case "statefulsets":
			statefulsets, err := clientset.AppsV1().StatefulSets(namespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				return nil, fmt.Errorf("获取StatefulSets失败: %v", err)
			}
			for i := range statefulsets.Items {
				item := &statefulsets.Items[i]
				item.APIVersion = "apps/v1"
				item.Kind = "StatefulSet"
				resources = append(resources, item)
			}

		case "services":
			serviceList, err := clientset.CoreV1().Services(namespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				return nil, fmt.Errorf("获取Services失败: %v", err)
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
			}

		case "configmaps":
			configMapList, err := clientset.CoreV1().ConfigMaps(namespace).List(context.TODO(), metav1.ListOptions{})
			if err!= nil {
				return nil, fmt.Errorf("获取ConfigMaps失败: %v", err)
			}
			for i := range configMapList.Items {
				item := &configMapList.Items[i]
				item.APIVersion = "v1"
				item.Kind = "ConfigMap"
				if item.Name == "kube-root-ca.crt" {
					continue
				}
				resources = append(resources, item)
			}
		case "secrets":
			secretList, err := clientset.CoreV1().Secrets(namespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				return nil, fmt.Errorf("获取Secrets失败: %v", err)
			}
			for i := range secretList.Items {
				item := &secretList.Items[i]
				item.APIVersion = "v1"
				item.Kind = "Secret"
				// 注意：对于 Secret 类型，可能需要根据实际需求决定是否要清除 data 字段或特定类型的 Secret
				resources = append(resources, item)
			}

		case "pvcs", "persistentvolumeclaims":
			pvcList, err := clientset.CoreV1().PersistentVolumeClaims(namespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				return nil, fmt.Errorf("获取PersistentVolumeClaims失败: %v", err)
			}
			for i := range pvcList.Items {
				item := &pvcList.Items[i]
				item.APIVersion = "v1"
				item.Kind = "PersistentVolumeClaim"
				resources = append(resources, item)
			}

		case "pvs", "persistentvolumes":
			// PV是集群级资源，不属于特定命名空间
			pvList, err := clientset.CoreV1().PersistentVolumes().List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				return nil, fmt.Errorf("获取PersistentVolumes失败: %v", err)
			}
			for i := range pvList.Items {
				item := &pvList.Items[i]
				item.APIVersion = "v1"
				item.Kind = "PersistentVolume"
				resources = append(resources, item)
			}

		case "cronjobs":
			cronjobList, err := clientset.BatchV1().CronJobs(namespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				// 尝试BatchV1beta1 API (针对较旧的Kubernetes版本)
				cronjobBetaList, betaErr := clientset.BatchV1beta1().CronJobs(namespace).List(context.TODO(), metav1.ListOptions{})
				if betaErr != nil {
					return nil, fmt.Errorf("获取CronJobs失败: %v, %v", err, betaErr)
				}
				for i := range cronjobBetaList.Items {
					item := &cronjobBetaList.Items[i]
					item.APIVersion = "batch/v1beta1"
					item.Kind = "CronJob"
					resources = append(resources, item)
				}
			} else {
				for i := range cronjobList.Items {
					item := &cronjobList.Items[i]
					item.APIVersion = "batch/v1"
					item.Kind = "CronJob"
					resources = append(resources, item)
				}
			}

		case "jobs":
			jobList, err := clientset.BatchV1().Jobs(namespace).List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				return nil, fmt.Errorf("获取Jobs失败: %v", err)
			}
			for i := range jobList.Items {
				item := &jobList.Items[i]
				item.APIVersion = "batch/v1"
				item.Kind = "Job"
				resources = append(resources, item)
			}
		}

		// 将资源转换为YAML并写入缓冲区
		for _, obj := range resources {

			
			// 清理不必要的字段
			cleanObject(obj)

			// 转换为YAML
			yamlBytes, err := yaml.Marshal(obj)
			if err != nil {
				return nil, fmt.Errorf("转换资源为YAML失败: %v", err)
			}

			// 写入缓冲区
			buffer.WriteString("--delimiter--\n")
			buffer.Write(yamlBytes)
			buffer.WriteString("\n")
		}
	}

	// 如果没有资源，返回空字符串
	if buffer.Len() == 0 {
		logger.Info("ExportResources", zap.String("namespace", namespace), zap.String("resourceTypes", strings.Join(resourceTypes, ",")), zap.String("result", "no resources found"))	
		return nil, nil
	}

	return []byte(buffer.String()), nil
}

// cleanObject 清理Kubernetes对象中不必要的字段
func cleanObject(obj runtime.Object) {
	// 清理通用的元数据字段
	if metaObj, ok := obj.(metav1.Object); ok {
		metaObj.SetManagedFields(nil)
		metaObj.SetSelfLink("")
		metaObj.SetUID("")
		metaObj.SetResourceVersion("")
		metaObj.SetGeneration(0)
		metaObj.SetCreationTimestamp(metav1.Time{})
		metaObj.SetDeletionTimestamp(nil)
		metaObj.SetDeletionGracePeriodSeconds(nil)
		// 如果需要，也可以在这里清理 annotations 或 labels
		// metaObj.SetAnnotations(nil)
		// metaObj.SetLabels(nil)
	}

	// 根据具体资源类型清理 Status 字段
	switch o := obj.(type) {
	case *appsv1.Deployment:
		o.Status = appsv1.DeploymentStatus{}
	case *appsv1.StatefulSet:
		o.Status = appsv1.StatefulSetStatus{}
	case *corev1.Service:
		// Service 的 status 字段通常比较简单，但为了统一也进行清理
		o.Status = corev1.ServiceStatus{}
	case *corev1.PersistentVolumeClaim:
		o.Status = corev1.PersistentVolumeClaimStatus{}
	case *corev1.PersistentVolume:
		o.Status = corev1.PersistentVolumeStatus{}
	case *batchv1.Job:
		o.Status = batchv1.JobStatus{}
	case *batchv1.CronJob:
		o.Status = batchv1.CronJobStatus{}
	case *batchv1beta1.CronJob: // 处理旧版 CronJob
		o.Status = batchv1beta1.CronJobStatus{}
	// 注意: corev1.Secret 类型通常没有 .Status 字段，其状态信息在 .Data 或 .StringData 中。
	// 如果有其他需要清理 status 的类型，可以在这里添加 case。
	// 例如，如果要处理 Pods:
	// case *corev1.Pod:
	// o.Status = corev1.PodStatus{}
	}
}

