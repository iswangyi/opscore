package kubernetes

import (
	"opscore/internal/log"
	"go.uber.org/zap"
	//labels "k8s.io/apimachinery/pkg/labels"
	//"k8s.io/client-go/informers"
	//"time"
	"context"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

)

type PodInfo struct {
	Name string  `json:"name"`
	Namespace string `json:"namespace"`
	Status string `json:"status"` 
	NodeName string  `json:"nodename"`
	Cpu string `json:"cpu"` 
	Memory string `json:"memory"` 
	RestartCount int `json:"restartCount"`
	Age string `json:"age"` 
}

// GetPodsInNamespace retrieves a list of pods in a given namespace using limit and continue token for pagination.
// It returns a slice of PodInfo, the continue token for the next page, and an error if any.
func GetPodsInNamespace(clusterID string, namespace string, limit int64, continueToken string) ([]PodInfo, string, error) {
	logger := log.GetLogger()
	podInfos := []PodInfo{}
	k8sClusterMetaData, err := GetClusterByClusterID(clusterID)
	if err != nil {
		logger.Error("GetPodsInNamespace: failed to get cluster metadata", zap.Error(err), zap.String("clusterID", clusterID))
		return podInfos, "", err
	}
	client, err := NewK8sClient(k8sClusterMetaData.KubeConfig)
	if err != nil {
		logger.Error("GetPodsInNamespace: failed to create k8s client", zap.Error(err), zap.String("clusterID", clusterID))
		return podInfos, "", err
	}

	listOptions := metav1.ListOptions{}
	if limit > 0 {
		listOptions.Limit = limit
	}
	if continueToken != "" {
		listOptions.Continue = continueToken
	}

	logger.Info("GetPodsInNamespace", zap.String("clusterID", clusterID), zap.String("namespace", namespace), zap.Int64("limit", limit), zap.String("continueToken", continueToken))
	pods, err := client.CoreV1().Pods(namespace).List(context.TODO(), listOptions)
	logger.Info("GetPodsInNamespace", zap.Int("获取到pods数:", len(pods.Items)))
	if err != nil {
		logger.Error("GetPodsInNamespace: failed to list pods", zap.Error(err), zap.String("clusterID", clusterID), zap.String("namespace", namespace))
		return podInfos, "", err
	}

	for _, pod := range pods.Items {
		// Ensure ContainerStatuses is not empty to avoid panic
		var restartCount int32 = 0
		if len(pod.Status.ContainerStatuses) > 0 {
			restartCount = pod.Status.ContainerStatuses[0].RestartCount
		}

		podInfo := PodInfo{
			Name:         pod.Name,
			Namespace:    pod.Namespace,
			Status:       string(pod.Status.Phase),
			NodeName:     pod.Spec.NodeName,
			Cpu:          "1", // Placeholder, consider fetching actual metrics if needed
			Memory:       "1", // Placeholder, consider fetching actual metrics if needed
			RestartCount: int(restartCount),
			Age:          pod.CreationTimestamp.Format("2006-01-02 15:04:05"),
		}
		podInfos = append(podInfos, podInfo)
	}

	return podInfos, pods.ListMeta.Continue, nil
}