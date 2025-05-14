"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MoreVertical, RefreshCw, Plus, Power, PowerOff, Cloud } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// 模拟云服务器数据
const mockCloudData = {
  instances: [
    {
      id: "i-1234567890abcdef0",
      name: "web-server-prod",
      status: "running",
      provider: "AWS",
      region: "us-east-1",
      type: "t3.medium",
      publicIp: "54.123.45.67",
      privateIp: "10.0.1.10",
      os: "Amazon Linux 2",
      cpu: "2 vCPU",
      memory: "4 GB",
      storage: "30 GB SSD",
      createdAt: "2023-01-15",
    },
    {
      id: "i-0987654321fedcba0",
      name: "app-server-prod",
      status: "running",
      provider: "AWS",
      region: "us-east-1",
      type: "t3.large",
      publicIp: "54.123.45.68",
      privateIp: "10.0.1.11",
      os: "Ubuntu 20.04",
      cpu: "2 vCPU",
      memory: "8 GB",
      storage: "50 GB SSD",
      createdAt: "2023-01-15",
    },
    {
      id: "i-abcdef1234567890",
      name: "db-server-prod",
      status: "running",
      provider: "AWS",
      region: "us-east-1",
      type: "r5.large",
      publicIp: "54.123.45.69",
      privateIp: "10.0.1.12",
      os: "Amazon Linux 2",
      cpu: "2 vCPU",
      memory: "16 GB",
      storage: "100 GB SSD",
      createdAt: "2023-01-15",
    },
    {
      id: "vm-123456",
      name: "web-server-staging",
      status: "running",
      provider: "Azure",
      region: "eastus",
      type: "Standard_D2s_v3",
      publicIp: "40.76.123.45",
      privateIp: "10.0.2.10",
      os: "Ubuntu 22.04",
      cpu: "2 vCPU",
      memory: "8 GB",
      storage: "30 GB SSD",
      createdAt: "2023-02-10",
    },
    {
      id: "vm-654321",
      name: "app-server-staging",
      status: "stopped",
      provider: "Azure",
      region: "eastus",
      type: "Standard_D4s_v3",
      publicIp: "40.76.123.46",
      privateIp: "10.0.2.11",
      os: "Windows Server 2019",
      cpu: "4 vCPU",
      memory: "16 GB",
      storage: "50 GB SSD",
      createdAt: "2023-02-10",
    },
    {
      id: "instance-123456789",
      name: "dev-server",
      status: "running",
      provider: "GCP",
      region: "us-central1",
      type: "e2-medium",
      publicIp: "35.123.45.67",
      privateIp: "10.0.3.10",
      os: "Debian 11",
      cpu: "2 vCPU",
      memory: "4 GB",
      storage: "20 GB SSD",
      createdAt: "2023-03-05",
    },
  ],
  volumes: [
    {
      id: "vol-1234567890abcdef0",
      name: "prod-data-vol-1",
      status: "in-use",
      provider: "AWS",
      region: "us-east-1",
      type: "gp3",
      size: "100 GB",
      attachedTo: "i-1234567890abcdef0",
      availabilityZone: "us-east-1a",
      createdAt: "2023-01-15",
    },
    {
      id: "vol-0987654321fedcba0",
      name: "prod-data-vol-2",
      status: "in-use",
      provider: "AWS",
      region: "us-east-1",
      type: "gp3",
      size: "500 GB",
      attachedTo: "i-abcdef1234567890",
      availabilityZone: "us-east-1a",
      createdAt: "2023-01-15",
    },
    {
      id: "vol-abcdef1234567890",
      name: "backup-vol-1",
      status: "available",
      provider: "AWS",
      region: "us-east-1",
      type: "st1",
      size: "1 TB",
      attachedTo: "",
      availabilityZone: "us-east-1b",
      createdAt: "2023-02-20",
    },
    {
      id: "disk-123456",
      name: "staging-data-disk-1",
      status: "in-use",
      provider: "Azure",
      region: "eastus",
      type: "Premium SSD",
      size: "256 GB",
      attachedTo: "vm-123456",
      availabilityZone: "eastus-1",
      createdAt: "2023-02-10",
    },
    {
      id: "disk-654321",
      name: "staging-data-disk-2",
      status: "available",
      provider: "Azure",
      region: "eastus",
      type: "Standard SSD",
      size: "512 GB",
      attachedTo: "",
      availabilityZone: "eastus-2",
      createdAt: "2023-02-15",
    },
  ],
  networks: [
    {
      id: "vpc-1234567890abcdef0",
      name: "prod-vpc",
      provider: "AWS",
      region: "us-east-1",
      cidr: "10.0.0.0/16",
      status: "available",
      subnets: 3,
      createdAt: "2023-01-10",
    },
    {
      id: "vpc-0987654321fedcba0",
      name: "staging-vpc",
      provider: "AWS",
      region: "us-east-1",
      cidr: "10.1.0.0/16",
      status: "available",
      subnets: 2,
      createdAt: "2023-02-05",
    },
    {
      id: "vnet-123456",
      name: "prod-vnet",
      provider: "Azure",
      region: "eastus",
      cidr: "10.2.0.0/16",
      status: "available",
      subnets: 4,
      createdAt: "2023-02-08",
    },
    {
      id: "network-123456789",
      name: "dev-network",
      provider: "GCP",
      region: "us-central1",
      cidr: "10.3.0.0/16",
      status: "available",
      subnets: 2,
      createdAt: "2023-03-01",
    },
  ],
}

export default function CloudPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTab, setSelectedTab] = useState("instances")
  const [isLoading, setIsLoading] = useState(true)
  const [cloudData, setCloudData] = useState({
    instances: [],
    volumes: [],
    networks: [],
  })
  const [selectedProvider, setSelectedProvider] = useState("all")

  // 加载云服务器数据
  useEffect(() => {
    fetchCloudData()
  }, [])

  // 获取云服务器数据
  const fetchCloudData = async () => {
    setIsLoading(true)
    try {
      // 模拟 API 请求延迟
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setCloudData(mockCloudData)
    } catch (error) {
      console.error("获取云服务器数据失败:", error)
      toast({
        title: "获取云服务器数据失败",
        description: "无法加载云服务器数据，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 过滤数据
  const getFilteredData = (dataType) => {
    const dataList = cloudData[dataType] || []

    // 先按提供商筛选
    const providerFiltered =
      selectedProvider === "all" ? dataList : dataList.filter((item) => item.provider === selectedProvider)

    // 再按搜索词筛选
    if (!searchTerm) return providerFiltered

    return providerFiltered.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.publicIp && item.publicIp.includes(searchTerm)) ||
        (item.privateIp && item.privateIp.includes(searchTerm)) ||
        (item.status && item.status.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }

  // 获取状态徽章
  const getStatusBadge = (status) => {
    switch (status) {
      case "running":
      case "available":
      case "in-use":
        return (
          <Badge variant="success" className="capitalize">
            {status}
          </Badge>
        )
      case "stopped":
        return (
          <Badge variant="secondary" className="capitalize">
            {status}
          </Badge>
        )
      case "error":
      case "warning":
        return (
          <Badge variant="destructive" className="capitalize">
            {status}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="capitalize">
            {status}
          </Badge>
        )
    }
  }

  // 处理实例操作
  const handleInstanceAction = (action, instance) => {
    toast({
      title: `${action} 实例`,
      description: `正在${action === "启动" ? "启动" : action === "停止" ? "停止" : "重启"}实例 ${instance.name}`,
    })

    // 模拟操作延迟
    setTimeout(() => {
      toast({
        title: `操作成功`,
        description: `实例 ${instance.name} 已${action === "启动" ? "启动" : action === "停止" ? "停止" : "重启"}`,
      })

      // 更新实例状态
      const updatedInstances = cloudData.instances.map((item) => {
        if (item.id === instance.id) {
          return {
            ...item,
            status: action === "启动" ? "running" : action === "停止" ? "stopped" : "running",
          }
        }
        return item
      })

      setCloudData({
        ...cloudData,
        instances: updatedInstances,
      })
    }, 2000)
  }

  // 获取云服务提供商图标
  const getProviderIcon = (provider) => {
    switch (provider) {
      case "AWS":
        return "aws.svg"
      case "Azure":
        return "azure.svg"
      case "GCP":
        return "gcp.svg"
      default:
        return "cloud.svg"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">云服务器管理</h2>
          <p className="text-muted-foreground">管理多云环境中的实例、存储和网络</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="选择提供商" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有提供商</SelectItem>
              <SelectItem value="AWS">AWS</SelectItem>
              <SelectItem value="Azure">Azure</SelectItem>
              <SelectItem value="GCP">GCP</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchCloudData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      <Tabs defaultValue="instances" value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="instances">实例</TabsTrigger>
          <TabsTrigger value="volumes">存储卷</TabsTrigger>
          <TabsTrigger value="networks">网络</TabsTrigger>
        </TabsList>

        <TabsContent value="instances">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>云实例</CardTitle>
                <CardDescription>管理云服务器实例</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    创建实例
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>创建云实例</DialogTitle>
                    <DialogDescription>填写以下信息创建新的云服务器实例</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label htmlFor="instance-name">名称</label>
                      <Input id="instance-name" placeholder="my-cloud-server" />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="instance-provider">云提供商</label>
                      <Select defaultValue="AWS">
                        <SelectTrigger>
                          <SelectValue placeholder="选择云提供商" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AWS">AWS</SelectItem>
                          <SelectItem value="Azure">Azure</SelectItem>
                          <SelectItem value="GCP">GCP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="instance-region">区域</label>
                      <Select defaultValue="us-east-1">
                        <SelectTrigger>
                          <SelectValue placeholder="选择区域" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                          <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                          <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                          <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="instance-type">实例类型</label>
                      <Select defaultValue="t3.medium">
                        <SelectTrigger>
                          <SelectValue placeholder="选择实例类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="t3.micro">t3.micro (2 vCPU, 1 GB RAM)</SelectItem>
                          <SelectItem value="t3.small">t3.small (2 vCPU, 2 GB RAM)</SelectItem>
                          <SelectItem value="t3.medium">t3.medium (2 vCPU, 4 GB RAM)</SelectItem>
                          <SelectItem value="t3.large">t3.large (2 vCPU, 8 GB RAM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="instance-os">操作系统</label>
                      <Select defaultValue="amazon-linux-2">
                        <SelectTrigger>
                          <SelectValue placeholder="选择操作系统" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amazon-linux-2">Amazon Linux 2</SelectItem>
                          <SelectItem value="ubuntu-20.04">Ubuntu 20.04 LTS</SelectItem>
                          <SelectItem value="ubuntu-22.04">Ubuntu 22.04 LTS</SelectItem>
                          <SelectItem value="windows-server-2019">Windows Server 2019</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="instance-storage">存储</label>
                      <Select defaultValue="30">
                        <SelectTrigger>
                          <SelectValue placeholder="选择存储大小" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 GB SSD</SelectItem>
                          <SelectItem value="50">50 GB SSD</SelectItem>
                          <SelectItem value="100">100 GB SSD</SelectItem>
                          <SelectItem value="200">200 GB SSD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="instance-network">网络</label>
                      <Select defaultValue="vpc-1234567890abcdef0">
                        <SelectTrigger>
                          <SelectValue placeholder="选择网络" />
                        </SelectTrigger>
                        <SelectContent>
                          {cloudData.networks.map((network) => (
                            <SelectItem key={network.id} value={network.id}>
                              {network.name} ({network.cidr})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">取消</Button>
                    <Button>创建</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>提供商</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="hidden md:table-cell">区域</TableHead>
                      <TableHead className="hidden md:table-cell">IP 地址</TableHead>
                      <TableHead className="hidden md:table-cell">配置</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredData("instances").length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                          未找到匹配的实例
                        </TableCell>
                      </TableRow>
                    ) : (
                      getFilteredData("instances").map((instance) => (
                        <TableRow key={instance.id}>
                          <TableCell className="font-medium">{instance.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Cloud className="h-4 w-4" />
                              {instance.provider}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(instance.status)}</TableCell>
                          <TableCell className="hidden md:table-cell">{instance.region}</TableCell>
                          <TableCell className="hidden md:table-cell">{instance.publicIp}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {instance.type}, {instance.cpu}, {instance.memory}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>查看详情</DropdownMenuItem>
                                <DropdownMenuItem>SSH 连接</DropdownMenuItem>
                                <DropdownMenuItem>控制台</DropdownMenuItem>
                                {instance.status === "running" ? (
                                  <>
                                    <DropdownMenuItem onClick={() => handleInstanceAction("停止", instance)}>
                                      <PowerOff className="mr-2 h-4 w-4" />
                                      停止
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleInstanceAction("重启", instance)}>
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                      重启
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleInstanceAction("启动", instance)}>
                                    <Power className="mr-2 h-4 w-4" />
                                    启动
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volumes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>存储卷</CardTitle>
                <CardDescription>管理云存储卷</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                创建存储卷
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>提供商</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>大小</TableHead>
                      <TableHead className="hidden md:table-cell">类型</TableHead>
                      <TableHead className="hidden md:table-cell">挂载到</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredData("volumes").length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                          未找到匹配的存储卷
                        </TableCell>
                      </TableRow>
                    ) : (
                      getFilteredData("volumes").map((volume) => (
                        <TableRow key={volume.id}>
                          <TableCell className="font-medium">{volume.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Cloud className="h-4 w-4" />
                              {volume.provider}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(volume.status)}</TableCell>
                          <TableCell>{volume.size}</TableCell>
                          <TableCell className="hidden md:table-cell">{volume.type}</TableCell>
                          <TableCell className="hidden md:table-cell">{volume.attachedTo || "-"}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>查看详情</DropdownMenuItem>
                                <DropdownMenuItem>创建快照</DropdownMenuItem>
                                {volume.status === "in-use" ? (
                                  <DropdownMenuItem>分离</DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem>挂载</DropdownMenuItem>
                                )}
                                <DropdownMenuItem>删除</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="networks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>网络</CardTitle>
                <CardDescription>管理云网络</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                创建网络
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>提供商</TableHead>
                      <TableHead>CIDR</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="hidden md:table-cell">区域</TableHead>
                      <TableHead className="hidden md:table-cell">子网数量</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredData("networks").length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                          未找到匹配的网络
                        </TableCell>
                      </TableRow>
                    ) : (
                      getFilteredData("networks").map((network) => (
                        <TableRow key={network.id}>
                          <TableCell className="font-medium">{network.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Cloud className="h-4 w-4" />
                              {network.provider}
                            </div>
                          </TableCell>
                          <TableCell>{network.cidr}</TableCell>
                          <TableCell>{getStatusBadge(network.status)}</TableCell>
                          <TableCell className="hidden md:table-cell">{network.region}</TableCell>
                          <TableCell className="hidden md:table-cell">{network.subnets}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>查看详情</DropdownMenuItem>
                                <DropdownMenuItem>管理子网</DropdownMenuItem>
                                <DropdownMenuItem>管理路由表</DropdownMenuItem>
                                <DropdownMenuItem>管理安全组</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
