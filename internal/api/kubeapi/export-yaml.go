package api

import (
	"net/http"
	"opscore/internal/kubernetes"
	"opscore/internal/log"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ExportResourcesRequest struct {
	ClusterID     string   `json:"clusterId"`
	Namespace     string   `json:"namespace"`
	ResourceTypes []string `json:"resourceTypes"`
}

type ExportResourcesResponse struct {
	Code int      `json:"code"`
	Msg  string   `json:"msg"`
	Data []string `json:"data"`
}

func ExportResourcesHandler(c *gin.Context) {
	logger := log.GetLogger()
	var req ExportResourcesRequest
	var resp ExportResourcesResponse
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("ExportResourcesHandler", zap.Error(err))
		resp = ExportResourcesResponse{Code: 1, Msg: err.Error(), Data: nil}
		c.JSON(http.StatusOK, resp)
		return
	}
	logger.Info("ExportResourcesHandler", zap.Any("req", req))
	data, err := kubernetes.ExportResources(req.ClusterID, req.Namespace, req.ResourceTypes)
	if err != nil {
		logger.Error("ExportResourcesHandler", zap.Error(err))
		resp = ExportResourcesResponse{Code: 1, Msg: err.Error(), Data: nil}
		c.JSON(http.StatusInternalServerError, resp)
		return
	}
	// data 转换为 string
	str := string(data)
	strs := strings.Split(str, "--delimiter--")

	resp = ExportResourcesResponse{Code: 0, Msg: "success",Data: strs }
	c.JSON(http.StatusOK, resp)

	return
}
