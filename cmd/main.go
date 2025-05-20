package main

import (
	"flag"
	"opscore/config"
	"opscore/internal/db"
	"opscore/internal/kubernetes"
	"opscore/internal/log"
	"opscore/internal/router"
	"os"
)

var (
	// Version 版本号
	Version = "0.1.0"
	migrate = flag.Bool("migratedb", false, "Initialize the database")
)

func main() {
	flag.Parse()

	config, err := config.SetupConfig()
	if err != nil {
		panic("failed to setup config: " + err.Error())
	}

	logger, err := log.InitLogger()
	if err != nil {
		panic("failed to initialize logger: " + err.Error())
	}
	defer logger.Sync()
	logger.Info("Custom logger initialized")

	_, err = db.NewGlobalDB()
	if err != nil {
		panic("failed to initialize database: " + err.Error())
	}

	if *migrate {
		if err := kubernetes.Migrate(); err!= nil {
			panic("failed to auto migrate k8s database: " + err.Error())
		}
		logger.Info("Database initialized")
		os.Exit(0)
	}

	logger.Info("Database initialized")

	go config.WatchConfigChange(logger)

	r := router.SetupRouter()

	// Listen and Server in 0.0.0.0:8080
	r.Run(":8080")
}
