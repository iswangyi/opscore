package router

import (
	"net/http"
	"opscore/internal/api" // 确保 api 包被导入
	"github.com/gin-gonic/gin"
)

var db = make(map[string]string) // 这个db似乎是示例代码，与k8s无关

func SetupRouter() *gin.Engine {
	// Disable Console Color
	// gin.DisableConsoleColor()
	r := gin.Default()


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
		k8sClusterRoutes.POST("", api.AddK8sClusterHandler)

		// GET /clusters - 获取所有 Kubernetes 集群的列表
		k8sClusterRoutes.GET("", api.ListK8sClustersHandler)

		// 未来可以添加其他集群相关的路由:
		// k8sClusterRoutes.GET("/:clusterId", api.GetK8sClusterHandler)
		// k8sClusterRoutes.PUT("/:clusterId", api.UpdateK8sClusterHandler)
		// k8sClusterRoutes.DELETE("/:clusterId", api.DeleteK8sClusterHandler)
		// k8sClusterRoutes.POST("/:clusterId/test", api.TestK8sClusterConnectionHandler) // 前端已有mock
	}

	// VMware 路由示例 (来自现有代码)
	unauthorized := r.Group("/vmware")
	unauthorized.GET("list", api.GetVMwareMachine)

	return r
}