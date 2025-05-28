package api

import (
	"opscore/internal/kubernetes"
	"opscore/internal/log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func GetPodsInNamespace(c *gin.Context) {
	clusterID := c.Query("clusterId")
	namespace := c.Query("namespace")
	limitStr := c.DefaultQuery("limit", "20") // Default limit to 20 items per page
	continueToken := c.Query("continue")

	logger := log.GetLogger()

	limit, err := strconv.ParseInt(limitStr, 10, 64)
	if err != nil {
		logger.Error("GetPodsInNamespace: invalid limit parameter", zap.Error(err), zap.String("limit", limitStr))
		resp := gin.H{"code": 1, "msg": "invalid limit parameter", "data": nil}
		c.JSON(http.StatusBadRequest, resp)
		return
	}

	logger.Info("GetPodsInNamespace API called", 
		zap.String("clusterID", clusterID), 
		zap.String("namespace", namespace), 
		zap.Int64("limit", limit),
		zap.String("continueToken", continueToken),
	)

	pods, nextContinueToken, err := kubernetes.GetPodsInNamespace(clusterID, namespace, limit, continueToken)
	if err != nil {
		logger.Error("GetPodsInNamespace API: failed to get pods", zap.Error(err))
		resp := gin.H{"code": 1, "msg": err.Error(), "data": nil}
		c.JSON(http.StatusInternalServerError, resp)
		return
	}

	respData := gin.H{
		"pods": pods,
		"continueToken": nextContinueToken,
	}
	resp := gin.H{"code": 0, "msg": "success", "data": respData}
	c.JSON(http.StatusOK, resp)
}