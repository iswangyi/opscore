package api
import (
	"opscore/internal/kubernetes"
	"opscore/internal/log"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"net/http"
)

func GetPodsInNamespace(c *gin.Context) {
	clusterID := c.Query("clusterId")
	namespace := c.Query("namespace")
	logger := log.GetLogger()
	logger.Info("GetPodsInNamespace", zap.String("clusterID", clusterID), zap.String("namespace", namespace))
	pods, err := kubernetes.GetPodsInNamespace(clusterID, namespace)
	if err != nil {
		logger.Error("GetPodsInNamespace", zap.Error(err))
		resp := gin.H{"code": 1, "msg": err.Error(), "data": nil}
		c.JSON(http.StatusOK, resp)
		return
	}
	resp := gin.H{"code": 0, "msg": "success", "data": pods}
	c.JSON(http.StatusOK, resp)
	return

}