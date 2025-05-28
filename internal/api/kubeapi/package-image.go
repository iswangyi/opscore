package api

import (
	"net/http"
	"opscore/internal/kubernetes"
	"opscore/internal/log"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type PackageImageRequest struct {
	Namespace     string   `json:"namespace"`
	ImageList     []string `json:"imageList"`
}
type PackageImageResponse struct {
	Code int      `json:"code"`
	Msg  string   `json:"msg"`
	FileName string `json:"fileName"`
}

func PackageImageHandler(c *gin.Context) {
	var req PackageImageRequest
	var res PackageImageResponse

	if err := c.ShouldBindJSON(&req); err != nil {
		log.GetLogger().Error("PackageImageHandler", zap.Error(err))
		if req.ImageList == nil || len(req.ImageList) == 0 {
			res.Code = http.StatusBadRequest
			res.Msg = "Invalid request, imageList is empty"
			log.GetLogger().Error("PackageImageHandler", zap.Any("req", req))
			c.JSON(http.StatusBadRequest, res)
			return
		}
		res.Code = http.StatusBadRequest
		res.Msg = "Invalid request"
		c.JSON(http.StatusBadRequest, res)
		return
	}
	log.GetLogger().Info("PackageImageHandler", zap.Any("req", req))

	go func ()  {
		resutl,err := kubernetes.PackageImage(req.Namespace, req.ImageList)
		if err!= nil {
			res.Code = http.StatusInternalServerError
			res.Msg = "Package image failed"
			c.JSON(http.StatusInternalServerError, res)
			return
		}
		if resutl == "" {
			res.Code = http.StatusInternalServerError
			res.Msg = "Package image failed"
			c.JSON(http.StatusInternalServerError, res)
			return
		}
		res.FileName= resutl
		res.Code = http.StatusOK
		res.Msg = "success"
		c.JSON(http.StatusOK, res)

	}()
	
	res.Code = http.StatusOK
	res.Msg = "success"
	c.JSON(http.StatusOK, res)
}

func CheckPackageImageResultHandler(c *gin.Context) {
	fileName := c.Query("fileName")
	if fileName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	result, err := kubernetes.CheckPackageImageResult(fileName)
	if err!= nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Check package image result failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"result": result})
}