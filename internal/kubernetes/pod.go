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

func GetPodsInNamespace(clusterID string, namespace string) ([]PodInfo, error) {
	logger := log.GetLogger()
	podInfos := []PodInfo{}
	k8sClusterMetaData,err := GetClusterByClusterID(clusterID)
	if err != nil {
		logger.Info("GetPodsInNamespace", zap.Error(err))
		return podInfos, err
	}
	client,err := NewK8sClient(k8sClusterMetaData.KubeConfig)
	if err!= nil {
		logger.Error("GetPodsInNamespace", zap.Error(err))
		return podInfos, err
	}
	logger.Info("GetPodsInNamespace", zap.String("clusterID", clusterID), zap.String("namespace", namespace))
	pods,err := client.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{})
	if err!= nil {
		logger.Info("GetPodsInNamespace", zap.Error(err))
		return podInfos, err
	}
	if len(pods.Items) == 0 {
		logger.Info("GetPodsInNamespace", zap.Int("pods", len(pods.Items)))
		return podInfos, nil
	}

	for _,pod := range pods.Items {


		podInfo := PodInfo{
			Name: pod.Name,
			Namespace: pod.Namespace,
			Status: string(pod.Status.Phase),
			NodeName: pod.Spec.NodeName,
			//Cpu: pod.Status.ContainerStatuses[0].Resources.Requests.Cpu().String(),
			//Memory: pod.Status.ContainerStatuses[0].Resources.Requests.Memory().String(),
			Cpu: "1",
			Memory: "1",
			RestartCount: int(pod.Status.ContainerStatuses[0].RestartCount),
			// 转换为年月日时分秒格式
			Age: pod.CreationTimestamp.Format("2006-01-02 15:04:05"),
		}
		podInfos = append(podInfos, podInfo)
	}

	// // 获取指定命名空间下的所有 Pod,informer模式
	// informerFactory := informers.NewSharedInformerFactory(client, time.Second*1)
	// podInformer := informerFactory.Core().V1().Pods()
	// podInformer.Informer().Run(nil)

	// logger.Info("GetPodsInNamespace", zap.String("clusterID", clusterID), zap.String("namespace", namespace))

	// pods, err := podInformer.Lister().Pods(namespace).List(labels.Everything())
	// if err != nil {
	// 	logger.Info("GetPodsInNamespace", zap.Error(err))
	// 	return podInfos, err
	// }
	// logger.Info("GetPodsInNamespace", zap.Int("pods", len(pods)))

	// for _,pod := range pods {
	// 	podInfo := PodInfo{
	// 		Name: pod.Name,
	// 		Namespace: pod.Namespace,
	// 		Status: string(pod.Status.Phase),
	// 		NodeName: pod.Spec.NodeName,
	// 		Cpu: pod.Status.ContainerStatuses[0].Resources.Requests.Cpu().String(),
	// 		Memory: pod.Status.ContainerStatuses[0].Resources.Requests.Memory().String(),
	// 		RestartCount: int(pod.Status.ContainerStatuses[0].RestartCount),
	// 		Age: time.Since(pod.CreationTimestamp.Time).String(),
	// 	}
	// 	podInfos = append(podInfos, podInfo)
	// }
	return podInfos, nil
}