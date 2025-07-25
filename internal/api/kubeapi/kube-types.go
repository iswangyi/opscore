package kubeapi

import (
	"opscore/internal/service/kubernetes"
)

type ListNamespaceResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data []string `json:"data"`
}

type ListPodResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data []kubernetes.PodInfo `json:"data"`
}