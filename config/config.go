package config

import (
	"fmt"
	"sync"
	"github.com/fsnotify/fsnotify"
	"github.com/spf13/viper"
	"go.uber.org/zap"
)

var (
	GlobalConfig *Config
	once         sync.Once
)

type Config struct {
	VMware VMwareConfig `mapstructure:"vmware"`
	Kubernetes Kubernetes `mapstructure:"kubernetes"`
}
type Kubernetes struct {
	PackageImagesDir string `mapstructure:"packageImagesDir"`
}

type VMwareConfig struct {
	URL      string `mapstructure:"url"`
	Insecure bool   `mapstructure:"insecure"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
}

func SetupConfig() (*Config, error) {
	viper.SetConfigName("config")  // 配置文件名称(无扩展名)
	viper.SetConfigType("yaml")    // 如果配置文件的名称中没有扩展名，则需要配置此项
	viper.AddConfigPath("/root/opscore/config")       // 还可以在工作目录中查找配置
	
	err := viper.ReadInConfig()
	if err != nil {
		fmt.Printf("Error reading config file: %s\n", err)
		panic("Failed to read config file")
	}

	var config Config
	err = viper.Unmarshal(&config)
	if err != nil {
		fmt.Printf("Error unmarshalling config: %s\n", err)
		panic("Failed to unmarshal config")
	}


	return &config, nil
}

func (config *Config)WatchConfigChange(logger *zap.Logger) {

	// 监听配置文件变化
	viper.OnConfigChange(func(e fsnotify.Event) {
		// 重新解析配置
		err := viper.Unmarshal(&config)
		if err != nil {
			logger.Error("Failed to unmarshal config", zap.Error(err))
			return
		}
	})

	viper.WatchConfig()
}

// GetVMwareConfig 返回 VMware 配置
func (c *Config) GetVMwareConfig() VMwareConfig {
	return c.VMware
}

// InitConfig 初始化全局配置
func InitConfig() (*Config, error) {
	var err error
	once.Do(func() {
		GlobalConfig, err = SetupConfig()
	})
	return GlobalConfig, err
}

// GetConfig 获取全局配置实例
func GetConfig() *Config {
	if GlobalConfig == nil {
		// 如果配置未初始化，则进行初始化
		config, err := InitConfig()
		if err != nil {
			panic("Failed to initialize config")
		}
		return config
	}
	return GlobalConfig
}

