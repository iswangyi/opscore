package main

import (
	"opscore/router"
	"opscore/internal/log"
	"opscore/internal/middleware"
	"opscore/config"
)

func main() {
	config, err := config.SetupConfig()
	if err!= nil {
		panic("failed to setup config: " + err.Error())
	}

	logger, err := log.InitLogger()
		if err != nil {
			panic("failed to initialize logger: " + err.Error())
		}
	defer logger.Sync()
	logger.Info("Custom logger initialized")
	go	config.WatchConfigChange(logger)


	r := router.SetupRouter()
	r.Use(middleware.LoggerMiddleware(logger))

	// Listen and Server in 0.0.0.0:8080
	r.Run(":8080")
}
