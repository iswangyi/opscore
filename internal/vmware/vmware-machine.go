package vmware

import (
	"context"
	"fmt"
	"github.com/vmware/govmomi/view"
	"github.com/vmware/govmomi/vim25/mo"
	"opscore/internal/log"
	"go.uber.org/zap"
)

type OpsVMwareMachine struct {
	ConfigName string
	GuestFullName string
}

func GetVMwareMachine() ([]*OpsVMwareMachine, error) {
	logger := log.GetLogger()
	ctx := context.Background()
	
	c, err := NewClient(ctx)
	if c == nil {
		logger.Error("VMware client is nil", zap.Error(err))
		return nil, fmt.Errorf("failed to create VMware client: %w", err)
	}
	
	m := view.NewManager(c)
	
	v, err := m.CreateContainerView(ctx, c.ServiceContent.RootFolder, []string{"VirtualMachine"}, true)
	if err != nil {
		logger.Error("Failed to create container view", zap.Error(err))
		return nil, err
	}
	
	defer v.Destroy(ctx)
	
	// Retrieve summary property for all machines
	// Reference: https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.VirtualMachine.html
	var vms []mo.VirtualMachine
	err = v.Retrieve(ctx, []string{"VirtualMachine"}, []string{"summary"}, &vms)
	if err != nil {
		logger.Error("Failed to retrieve VM information", zap.Error(err))
		return nil, err
	}
	
	// Print summary per vm (see also: govc/vm/info.go)
	
	for _, vm := range vms {
		logger.Debug("VM information",
			zap.String("name", vm.Summary.Config.Name),
			zap.String("guestFullName", vm.Summary.Config.GuestFullName))
	}

	if len(vms) == 0 {
		logger.Info("No VMs found")
		return nil, nil
	}
	opsVms := make([]*OpsVMwareMachine,len(vms))

	for i:=0; i<len(vms); i++ {
		if vms[i].Summary.Config.Name == "" {
			logger.Info("VM name is empty")
			continue
		}
		opsVms[i] = &OpsVMwareMachine{
			ConfigName: vms[i].Summary.Config.Name,
			GuestFullName: vms[i].Summary.Config.GuestFullName,
		}
	}
	
	return opsVms, nil
}