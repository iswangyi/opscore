package vmware

import (
	"opscore/internal/service/vmware"

	"github.com/gin-gonic/gin"
)

func GetVMwareMachine(c *gin.Context) {
	vm,err := vmware.GetVMwareMachine()	
	if err!= nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(
		200, 
		gin.H{
			"length": len(vm),
			"data": vm,
	})
}