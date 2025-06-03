package router

import (
	"net/http"
	kubeapi "opscore/internal/api/kubeapi" 
	 "opscore/internal/api"
	"opscore/internal/log"
	"opscore/internal/middleware"

	"github.com/gin-gonic/gin"
)

var db = make(map[string]string) // 这个db似乎是示例代码，与k8s无关

func SetupRouter() *gin.Engine {
	logger := log.GetLogger() 

	// Disable Console Color
	// gin.DisableConsoleColor()
	r := gin.Default()

	// Cors 中间件
	r.Use(middleware.LoggerMiddleware(logger))
	r.Use(middleware.CORSMiddleware())


	// Ping test
	r.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	// Get user value
	r.GET("/user/:name", func(c *gin.Context) {
		user := c.Params.ByName("name")
		value, ok := db[user]
		if ok {
			c.JSON(http.StatusOK, gin.H{"user": user, "value": value})
		} else {
			c.JSON(http.StatusOK, gin.H{"user": user, "status": "no value"})
		}
	})

	// Authorized group (uses gin.BasicAuth() middleware)
	// Same than:
	// authorized := r.Group("/")
	// authorized.Use(gin.BasicAuth(gin.Credentials{
	//	  "foo":  "bar",
	//	  "manu": "123",
	//}))
	authorized := r.Group("/", gin.BasicAuth(gin.Accounts{
		"foo":  "bar", // user:foo password:bar
		"manu": "123", // user:manu password:123
	}))

	/* example curl for /admin with basicauth header
	   Zm9vOmJhcg== is base64("foo:bar")

		curl -X POST \
	  	http://localhost:8080/admin \
	  	-H 'authorization: Basic Zm9vOmJhcg==' \
	  	-H 'content-type: application/json' \
	  	-d '{"value":"bar"}'
	*/
	authorized.POST("admin", func(c *gin.Context) {
		user := c.MustGet(gin.AuthUserKey).(string)

		// Parse JSON
		var json struct {
			Value string `json:"value" binding:"required"`
		}

		if c.Bind(&json) == nil {
			db[user] = json.Value
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		}
	})

	// Kubernetes 集群管理 API 路由组
	// 根据前端 api.js, 路径是 /clusters
	k8sClusterRoutes := r.Group("/clusters")
	{
		// POST /clusters - 添加一个新的 Kubernetes 集群
		// 使用我们重构后的 api.AddK8sClusterHandler
		k8sClusterRoutes.POST("", kubeapi.AddK8sClusterHandler)

		// GET /clusters - 获取所有 Kubernetes 集群的列表
		k8sClusterRoutes.GET("", kubeapi.ListK8sClustersHandler)

		//导出yaml
		k8sClusterRoutes.POST("/export-yaml", kubeapi.ExportResourcesHandler)
		// 未来可以添加其他集群相关的路由:
		// k8sClusterRoutes.GET("/:clusterId", api.GetK8sClusterHandler)
		// k8sClusterRoutes.PUT("/:clusterId", api.UpdateK8sClusterHandler)
		// k8sClusterRoutes.DELETE("/:clusterId", api.DeleteK8sClusterHandler)
		// k8sClusterRoutes.POST("/:clusterId/test", api.TestK8sClusterConnectionHandler) // 前端已有mock
	}

	kubernetesRoutes := r.Group("/kubernetes")
	{
		// GET /kubernetes/namespaces - 获取所有命名空间
		kubernetesRoutes.GET("/:clusterID/namespaces", kubeapi.GetNamespaces)
		kubernetesRoutes.GET("/listpods",kubeapi.GetPodsInNamespace)
		//kubernetesRoutes.GET("/namespaces/:namespace/services", kubernetes.GetServicesInNamespace)
		//kubernetesRoutes.GET("/namespaces/:namespace/deployments", kubernetes.GetDeploymentsInNamespace)
		//kubernetesRoutes.GET("/namespaces/:namespace/statefulsets", kubernetes.GetStatefulSetsInNamespace)
		//kubernetesRoutes.GET("/namespaces/:namespace/daemonsets", kubernetes.GetDaemonSetsInNamespace)
		//kubernetesRoutes.GET("/namespaces/:namespace/jobs", kubernetes.GetJobsInNamespace)
		//kubernetesRoutes.GET("/namespaces/:namespace/cronjobs", kubernetes.GetCronJobsInNamespace)
	}


	// VMware 路由示例 (来自现有代码)
	unauthorized := r.Group("/vmware")
	unauthorized.GET("list", api.GetVMwareMachine)

	return r
}