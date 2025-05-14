package vmware

import (
	"context"
	"flag"
	"fmt"
	"net/url"
	"opscore/config"
	"opscore/internal/log"
	"os"
	"strings"

	"github.com/vmware/govmomi/session/cache"
	"github.com/vmware/govmomi/simulator"
	"github.com/vmware/govmomi/vim25"
	"github.com/vmware/govmomi/vim25/soap"
	"go.uber.org/zap"
)

// getEnvString returns string from environment variable.
func getEnvString(v string, def string) string {
	r := os.Getenv(v)
	if r == "" {
		return def
	}

	return r
}

// getEnvBool returns boolean from environment variable.
func getEnvBool(v string, def bool) bool {
	r := os.Getenv(v)
	if r == "" {
		return def
	}

	switch strings.ToLower(r[0:1]) {
	case "t", "y", "1":
		return true
	}

	return false
}

const (
	envURL      = "GOVMOMI_URL"
	envUserName = "GOVMOMI_USERNAME"
	envPassword = "GOVMOMI_PASSWORD"
	envInsecure = "GOVMOMI_INSECURE"
)

var urlDescription = fmt.Sprintf("ESX or vCenter URL [%s]", envURL)
var urlFlag = flag.String("url", getEnvString(envURL, ""), urlDescription)

var insecureDescription = fmt.Sprintf("Don't verify the server's certificate chain [%s]", envInsecure)
var insecureFlag = flag.Bool("insecure", getEnvBool(envInsecure, false), insecureDescription)

func processOverride(u *url.URL) {
	envUsername := os.Getenv(envUserName)
	envPassword := os.Getenv(envPassword)

	// Override username if provided
	if envUsername != "" {
		var password string
		var ok bool

		if u.User != nil {
			password, ok = u.User.Password()
		}

		if ok {
			u.User = url.UserPassword(envUsername, password)
		} else {
			u.User = url.User(envUsername)
		}
	}

	// Override password if provided
	if envPassword != "" {
		var username string

		if u.User != nil {
			username = u.User.Username()
		}

		u.User = url.UserPassword(username, envPassword)
	}
}

// NewClient creates a vim25.Client for use in the examples
func NewClient(ctx context.Context) (*vim25.Client, error) {
	config := config.GetConfig()
	log := log.GetLogger()
	// Parse URL from string
	u, err := soap.ParseURL(config.VMware.URL)
	if err != nil {
		return nil, err
	}
	u.User = url.UserPassword(config.VMware.User, config.VMware.Password)

	// 打印获取到的地址 密码 账号
	log.Debug("User:", zap.String("user", config.VMware.User))
	log.Debug("Password:", zap.String("password", config.VMware.Password))



	// Override username and/or password as required
	//processOverride(u)

	// Share govc's session cache
	s := &cache.Session{
		URL:      u,
		Insecure: config.VMware.Insecure,
	}

	c := new(vim25.Client)
	err = s.Login(ctx, c, nil)
	if err != nil {
		return nil, err
	}

	return c, nil
}

// Run calls f with Client create from the -url flag if provided,
// otherwise runs the example against vcsim.
func Run(f func(context.Context, *vim25.Client) error) {
	log := log.GetLogger()
	flag.Parse()

	var err error
	var c *vim25.Client

	if *urlFlag == "" {
		err = simulator.VPX().Run(f)
	} else {
		ctx := context.Background()
		c, err = NewClient(ctx)
		if err == nil {
			err = f(ctx, c)
		}
	}
	if err != nil {
		log.Error(err.Error())
	}
}