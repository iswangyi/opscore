package log

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var globalLogger *zap.Logger

func InitLogger() (*zap.Logger, error) {
	config := zap.NewProductionConfig()
	
	// 自定义编码器配置
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	config.EncoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder
	// 配置堆栈跟踪格式
	config.EncoderConfig.StacktraceKey = "stacktrace"
	config.EncoderConfig.LineEnding = "\n"
	// 使用更友好的控制台编码器
	config.Encoding = "console"
	
	logger, err := config.Build(
		zap.AddCallerSkip(1),
		zap.AddStacktrace(zapcore.ErrorLevel),
	)
	if err != nil {
		return nil, err
	}
	
	globalLogger = logger
	return logger, nil
}

func GetLogger() *zap.Logger {
	if globalLogger == nil {
		logger, _ := InitLogger()
		return logger
	}
	return globalLogger
}