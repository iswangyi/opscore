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
import { Search, MoreVertical, RefreshCw, Plus, Power, PowerOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// 模拟 VMware 数据
const mockVMwareData = {
  hosts: [
    {
      id: "host-1",
      name: "esxi-host-01",
      status: "online",
      ip: "192.168.1.101",
      cpuUsage: "45%",
      memoryUsage: "60%",
      version: "ESXi 7.0 Update 3",
    },
    {
      id: "host-2",
      name: "esxi-host-02",
      status: "online",
      ip: "192.168.1.102",
      cpuUsage: "30%",
      memoryUsage: "45%",
      version: "ESXi 7.0 Update 3",
    },
    {
      id: "host-3",
      name: "esxi-host-03",
      status: "maintenance",
      ip: "192.168.1.103",
      cpuUsage: "5%",
      memoryUsage: "20%",
      version: "ESXi 7.0 Update 2",
    },
  ],
  vms: [
    {
      id: "vm-1",
      name: "web-server-01",
      status: "running",
      host: "esxi-host-01",
      ip: "192.168.1.201",
      os: "Ubuntu 20.04",
      cpu: "2 vCPU",
      memory: "4 GB",
      storage: "80 GB",
    },
    {
      id: "vm-2",
      name: "db-server-01",
      status: "running",
      host: "esxi-host-01",
      ip: "192.168.1.202",
      os: "CentOS 8",
      cpu: "4 vCPU",
      memory: "16 GB",
      storage: "500 GB",
    },
    {
      id: "vm-3",
      name: "app-server-01",
      status: "stopped",
      host: "esxi-host-02",
      ip: "192.168.1.203",
      os: "Windows Server 2019",
      cpu: "4 vCPU",
      memory: "16 GB",
      storage: "200 GB",
    },
    {
      id: "vm-4",
      name: "test-server-01",
      status: "running",
      host: "esxi-host-02",
      ip: "192.168.1.204",
      os: "Ubuntu 22.04",
      cpu: "2 vCPU",
      memory: "8 GB",
      storage: "100 GB",
    },
    {
      id: "vm-5",
      name: "dev-server-01",
      status: "suspended",
      host: "esxi-host-01",
      ip: "192.168.1.205",
      os: "Debian 11",
      cpu: "2 vCPU",
      memory: "4 GB",
      storage: "120 GB",
    },
  ],
  datastores: [
    {
      id: "ds-1",
      name: "datastore-01",
      type: "VMFS",
      capacity: "2 TB",
      free: "1.2 TB",
      status: "normal",
    },
    {
      id: "ds-2",
      name: "datastore-02",
      type: "NFS",
      capacity: "4 TB",
      free: "3.5 TB",
      status: "normal",
    },
    {
      id: "ds-3",
      name: "datastore-03",
      type: "VMFS",
      capacity: "1 TB",
      free: "200 GB",
      status: "warning",
    },
  ],
}

export default function VMwarePage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTab, setSelectedTab] = useState("vms")
  const [isLoading, setIsLoading] = useState(true)
  const [vmwareData, setVMwareData] = useState({
    hosts: [],
    vms: [],
    datastores: [],
  })

  // 加载 VMware 数据
  useEffect(() => {
    fetchVMwareData()
  }, [])

  // 获取 VMware 数据
  const fetchVMwareData = async () => {
    setIsLoading(true)
    try {
      // 模拟 API 请求延迟
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setVMwareData(mockVMwareData)
    } catch (error) {
      console.error("获取 VMware 数据失败:", error)
      toast({
        title: "获取 VMware 数据失败",
        description: "无法加载 VMware 数据，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 过滤数据
  const getFilteredData = (dataType) => {
    const dataList = vmwareData[dataType] || []

    if (!searchTerm) return dataList

    return dataList.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.ip && item.ip.includes(searchTerm)) ||
        (item.status && item.status.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }

  // 获取状态徽章
  const getStatusBadge = (status) => {
    switch (status) {
      case "running":
      case "online":
      case "normal":
        return (
          <Badge variant="success" className="capitalize">
            {status}
          </Badge>
        )
      case "stopped":
      case "offline":
        return (
          <Badge variant="secondary" className="capitalize">
            {status}
          </Badge>
        )
      case "suspended":
      case "maintenance":
      case "warning":
        return (
          <Badge variant="warning" className="capitalize">
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

  // 处理虚拟机操作
  const handleVMAction = (action, vm) => {
    toast({
      title: `${action} 虚拟机`,
      description: `正在${action === "启动" ? "启动" : action === "关闭" ? "关闭" : "重启"}虚拟机 ${vm.name}`,
    })

    // 模拟操作延迟
    setTimeout(() => {
      toast({
        title: `操作成功`,
        description: `虚拟机 ${vm.name} 已${action === "启动" ? "启动" : action === "关闭" ? "关闭" : "重启"}`,
      })

      // 更新虚拟机状态
      const updatedVMs = vmwareData.vms.map((item) => {
        if (item.id === vm.id) {
          return {
            ...item,
            status: action === "启动" ? "running" : action === "关闭" ? "stopped" : "running",
          }
        }
        return item
      })

      setVMwareData({
        ...vmwareData,
        vms: updatedVMs,
      })
    }, 2000)
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
          <h2 className="text-2xl font-bold tracking-tight">VMware 管理</h2>
          <p className="text-muted-foreground">管理 VMware vSphere 环境中的主机、虚拟机和存储</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchVMwareData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      <Tabs defaultValue="vms" value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="vms">虚拟机</TabsTrigger>
          <TabsTrigger value="hosts">主机</TabsTrigger>
          <TabsTrigger value="datastores">存储</TabsTrigger>
        </TabsList>

        <TabsContent value="vms">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>虚拟机</CardTitle>
                <CardDescription>管理 VMware 虚拟机</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    新建虚拟机
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新建虚拟机</DialogTitle>
                    <DialogDescription>填写以下信息创建新的虚拟机</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label htmlFor="vm-name">名称</label>
                      <Input id="vm-name" placeholder="new-vm-01" />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="vm-host">主机</label>
                      <Select defaultValue="host-1">
                        <SelectTrigger>
                          <SelectValue placeholder="选择主机" />
                        </SelectTrigger>
                        <SelectContent>
                          {vmwareData.hosts.map((host) => (
                            <SelectItem key={host.id} value={host.id}>
                              {host.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="vm-os">操作系统</label>
                      <Select defaultValue="ubuntu20">
                        <SelectTrigger>
                          <SelectValue placeholder="选择操作系统" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ubuntu20">Ubuntu 20.04</SelectItem>
                          <SelectItem value="ubuntu22">Ubuntu 22.04</SelectItem>
                          <SelectItem value="centos8">CentOS 8</SelectItem>
                          <SelectItem value="windows2019">Windows Server 2019</SelectItem>
                          <SelectItem value="windows2022">Windows Server 2022</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label htmlFor="vm-cpu">CPU</label>
                        <Select defaultValue="2">
                          <SelectTrigger>
                            <SelectValue placeholder="选择 CPU 数量" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 vCPU</SelectItem>
                            <SelectItem value="2">2 vCPU</SelectItem>
                            <SelectItem value="4">4 vCPU</SelectItem>
                            <SelectItem value="8">8 vCPU</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <label htmlFor="vm-memory">内存</label>
                        <Select defaultValue="4">
                          <SelectTrigger>
                            <SelectValue placeholder="选择内存大小" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 GB</SelectItem>
                            <SelectItem value="4">4 GB</SelectItem>
                            <SelectItem value="8">8 GB</SelectItem>
                            <SelectItem value="16">16 GB</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="vm-storage">存储</label>
                      <Select defaultValue="ds-1">
                        <SelectTrigger>
                          <SelectValue placeholder="选择存储" />
                        </SelectTrigger>
                        <SelectContent>
                          {vmwareData.datastores.map((ds) => (
                            <SelectItem key={ds.id} value={ds.id}>
                              {ds.name} ({ds.free} 可用)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="vm-disk">磁盘大小</label>
                      <Select defaultValue="80">
                        <SelectTrigger>
                          <SelectValue placeholder="选择磁盘大小" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="40">40 GB</SelectItem>
                          <SelectItem value="80">80 GB</SelectItem>
                          <SelectItem value="120">120 GB</SelectItem>
                          <SelectItem value="250">250 GB</SelectItem>
                          <SelectItem value="500">500 GB</SelectItem>
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
                      <TableHead>状态</TableHead>
                      <TableHead>主机</TableHead>
                      <TableHead className="hidden md:table-cell">IP 地址</TableHead>
                      <TableHead className="hidden md:table-cell">操作系统</TableHead>
                      <TableHead className="hidden md:table-cell">配置</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredData("vms").length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                          未找到匹配的虚拟机
                        </TableCell>
                      </TableRow>
                    ) : (
                      getFilteredData("vms").map((vm) => (
                        <TableRow key={vm.id}>
                          <TableCell className="font-medium">{vm.name}</TableCell>
                          <TableCell>{getStatusBadge(vm.status)}</TableCell>
                          <TableCell>{vm.host}</TableCell>
                          <TableCell className="hidden md:table-cell">{vm.ip}</TableCell>
                          <TableCell className="hidden md:table-cell">{vm.os}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {vm.cpu}, {vm.memory}, {vm.storage}
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
                                <DropdownMenuItem>编辑设置</DropdownMenuItem>
                                <DropdownMenuItem>控制台</DropdownMenuItem>
                                {vm.status === "running" ? (
                                  <>
                                    <DropdownMenuItem onClick={() => handleVMAction("关闭", vm)}>
                                      <PowerOff className="mr-2 h-4 w-4" />
                                      关闭
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleVMAction("重启", vm)}>
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                      重启
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleVMAction("启动", vm)}>
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

        <TabsContent value="hosts">
          <Card>
            <CardHeader>
              <CardTitle>主机</CardTitle>
              <CardDescription>管理 VMware ESXi 主机</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>IP 地址</TableHead>
                      <TableHead>CPU 使用率</TableHead>
                      <TableHead>内存使用率</TableHead>
                      <TableHead className="hidden md:table-cell">版本</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredData("hosts").length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                          未找到匹配的主机
                        </TableCell>
                      </TableRow>
                    ) : (
                      getFilteredData("hosts").map((host) => (
                        <TableRow key={host.id}>
                          <TableCell className="font-medium">{host.name}</TableCell>
                          <TableCell>{getStatusBadge(host.status)}</TableCell>
                          <TableCell>{host.ip}</TableCell>
                          <TableCell>{host.cpuUsage}</TableCell>
                          <TableCell>{host.memoryUsage}</TableCell>
                          <TableCell className="hidden md:table-cell">{host.version}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>查看详情</DropdownMenuItem>
                                <DropdownMenuItem>进入维护模式</DropdownMenuItem>
                                <DropdownMenuItem>重启</DropdownMenuItem>
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

        <TabsContent value="datastores">
          <Card>
            <CardHeader>
              <CardTitle>存储</CardTitle>
              <CardDescription>管理 VMware 数据存储</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>容量</TableHead>
                      <TableHead>可用空间</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredData("datastores").length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                          未找到匹配的存储
                        </TableCell>
                      </TableRow>
                    ) : (
                      getFilteredData("datastores").map((ds) => (
                        <TableRow key={ds.id}>
                          <TableCell className="font-medium">{ds.name}</TableCell>
                          <TableCell>{ds.type}</TableCell>
                          <TableCell>{ds.capacity}</TableCell>
                          <TableCell>{ds.free}</TableCell>
                          <TableCell>{getStatusBadge(ds.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>查看详情</DropdownMenuItem>
                                <DropdownMenuItem>浏览文件</DropdownMenuItem>
                                <DropdownMenuItem>扩展容量</DropdownMenuItem>
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
