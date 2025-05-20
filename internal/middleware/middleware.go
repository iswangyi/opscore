package middleware

import (
	"net/http" // 新增导入
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// LoggerMiddleware 返回一个 Gin 中间件，用于记录请求日志
func LoggerMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录请求开始时间
		start := time.Now()

		// 获取请求信息
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery
		method := c.Request.Method
		clientIP := c.ClientIP()

		// 处理请求
		c.Next()

		// 计算请求耗时
		latency := time.Since(start)

		// 获取响应信息
		statusCode := c.Writer.Status()

		// 记录日志
		logger.Info("HTTP request",
			zap.String("method", method),
			zap.String("path", path),
			zap.String("query", query),
			zap.String("client_ip", clientIP),
			zap.Int("status_code", statusCode),
			zap.Duration("latency", latency),
			zap.String("user_agent", c.Request.UserAgent()),
		)
	}
}


// 跨域中间件
func CorsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 允许的源，生产环境建议替换为你的前端域名，例如 "http://localhost:3000"
		// 使用 "*" 表示允许任何源，这在开发时很方便
		c.Header("Access-Control-Allow-Origin", "*")
		// 允许的方法
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		// 允许的请求头，确保包含了前端可能发送的所有自定义头部，特别是 'Authorization' 和 'Content-Type'
		c.Header("Access-Control-Allow-Headers", "DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization,token")
		// 暴露给前端的响应头，如果前端需要读取非简单响应头之外的头部，在此列出
		c.Header("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Content-Type")
		// 是否允许发送 Cookie 等凭证信息
		c.Header("Access-Control-Allow-Credentials", "true")

		// 预检请求 (OPTIONS) 的处理
		// 浏览器在发送实际的跨域请求前，会先发送一个 OPTIONS 请求来询问服务器是否允许该跨域请求
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent) // 对于 OPTIONS 请求，返回 204 No Content 状态码
			return                                  // 并终止后续处理
		}

		// 处理实际的请求
		c.Next() // 将请求传递给后续的处理函数
	}
}