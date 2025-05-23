package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"strings"
)

// ConfigItem 定义JSON中每个配置项的结构体
type ConfigItem struct {
	Key    string `json:"key"`
	Flags  int    `json:"flags"`
	Value  string `json:"value"`
}

func main() {
	// 读取JSON文件
	data, err := ioutil.ReadFile("kv.json")
	if err != nil {
		fmt.Printf("读取文件失败: %v\n", err)
		return
	}

	// 解析JSON数据
	var configItems []ConfigItem
	err = json.Unmarshal(data, &configItems)
	if err != nil {
		fmt.Printf("解析JSON失败: %v\n", err)
		return
	}

	// 遍历每个配置项
	for i, item := range configItems {
		// 对value进行Base64解码
		decodedValue, err := base64.StdEncoding.DecodeString(item.Value)
		if err != nil {
			fmt.Printf("Base64解码失败: %v\n", err)
			continue
		}

		// 将解码后的内容转换为字符串
		content := string(decodedValue)

		// 修改配置项
		content = strings.ReplaceAll(content, "Username: root", "Username: aos")
		content = strings.ReplaceAll(content, "YFKUDeCWD1AL3pGnxHtVoAf3dcwcrTgL", "h5dvvTDA@Huawei")
		content = strings.ReplaceAll(content, "DB: 8", "DB: 18")
		content = strings.ReplaceAll(content, "10.96.36.8", "mqnamesrv")
		content = strings.ReplaceAll(content,"root:PhLBNTUgbJiiTYcwrt1O","aos:root:PhLBNTUgbJiiTYcwrt1O")

		// 将修改后的内容重新进行Base64编码
		encodedValue := base64.StdEncoding.EncodeToString([]byte(content))

		// 更新配置项的value
		configItems[i].Value = encodedValue
	}

	// 将修改后的配置项重新编码为JSON
	outputData, err := json.MarshalIndent(configItems, "", "  ")
	if err != nil {
		fmt.Printf("编码为JSON失败: %v\n", err)
		return
	}

	// 将修改后的JSON数据保存到文件
	err = ioutil.WriteFile("kv_modified.json", outputData, 0644)
	if err != nil {
		fmt.Printf("保存文件失败: %v\n", err)
		return
	}

	fmt.Println("配置文件修改并保存成功！")
}
