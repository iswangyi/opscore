package main

import (
	"flag"
	"opscore/config"
	"opscore/internal/datamigrate"
	"opscore/internal/db"
	"opscore/internal/kubernetes"
	"opscore/internal/log"
	"opscore/internal/router"
	"os"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

var (
	// Version 版本号
	Version = "0.1.0"
	migrate = flag.Bool("migratedb", false, "Initialize the database")
)

func main() {
	flag.Parse()

	// 初始化日志
	logger, err := log.InitLogger()
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	logger.Info("Starting OpsCore application")

	// 加载配置
	cfg, err := config.SetupConfig()
	if err != nil {
		logger.Fatal("Failed to load config", zap.Error(err))
	}

	// 初始化数据库
	_, err = db.NewGlobalDB()
	if err != nil {
		logger.Fatal("Failed to initialize database", zap.Error(err))
	}

	// 执行数据库迁移
	if err := kubernetes.Migrate(); err != nil {
		logger.Fatal("Failed to migrate kubernetes database", zap.Error(err))
	}

	// 执行数据迁移模块的数据库迁移
	if err := datamigrate.Migrate(); err != nil {
		logger.Fatal("Failed to migrate datamigrate database", zap.Error(err))
	}

	// 如果只是迁移数据库，则退出
	if *migrate {
		logger.Info("Database migration completed")
		os.Exit(0)
	}

	// 设置Gin模式
	gin.SetMode(gin.ReleaseMode)

	// 设置路由
	r := router.SetupRouter()

	// 启动服务器
	port := "8080" // 默认端口
	logger.Info("Server starting", zap.String("port", port))
	if err := r.Run(":" + port); err != nil {
		logger.Fatal("Failed to start server", zap.Error(err))
	}
}
