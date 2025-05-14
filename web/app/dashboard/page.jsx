"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RefreshCw, Server, Database, Cloud, Activity, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { clustersAPI } from "@/lib/api"

export default function DashboardPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [clusters, setClusters] = useState([])
  const [stats, setStats] = useState({
    clusters: 0,
    nodes: 0,
    pods: 0,
    deployments: 0,
    services: 0,
  })

  // 加载集群列表和统计数据
  useEffect(() => {
    fetchDashboardData()
  }, [])

  // 获取仪表盘数据
  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // 获取集群列表
      const clustersData = await clustersAPI.getAll()
      setClusters(clustersData)

      // 计算统计数据
      let totalNodes = 0
      let totalPods = 0
      let totalDeployments = 0
      let totalServices = 0

      // 模拟从集群获取统计数据
      clustersData.forEach((cluster) => {
        if (cluster.status === "connected") {
          totalNodes += Math.floor(Math.random() * 5) + 1
          totalPods += Math.floor(Math.random() * 20) + 5
          totalDeployments += Math.floor(Math.random() * 10) + 2
          totalServices += Math.floor(Math.random() * 8) + 2
        }
      })

      setStats({
        clusters: clustersData.length,
        nodes: totalNodes,
        pods: totalPods,
        deployments: totalDeployments,
        services: totalServices,
      })
    } catch (error) {
      console.error("获取仪表盘数据失败:", error)
      toast({
        title: "获取仪表盘数据失败",
        description: "无法加载仪表盘数据，请稍后重试",
        variant: "destructive",
      })

      // 设置默认统计数据
      setStats({
        clusters: 0,
        nodes: 0,
        pods: 0,
        deployments: 0,
        services: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 获取集群状态徽章类名
  const getClusterStatusClass = (status) => {
    switch (status) {
      case "connected":
        return "bg-green-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
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
      <div>
        <h2 className="text-2xl font-bold tracking-tight">仪表盘</h2>
        <p className="text-muted-foreground">系统概览和资源监控</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">集群数量</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clusters}</div>
            <p className="text-xs text-muted-foreground">
              {stats.clusters > 0
                ? `${Math.round((clusters.filter((c) => c.status === "connected").length / stats.clusters) * 100)}% 在线`
                : "无集群"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">节点数量</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.nodes}</div>
            <p className="text-xs text-muted-foreground">
              {stats.clusters > 0 ? `平均每集群 ${(stats.nodes / stats.clusters).toFixed(1)} 个节点` : "无节点"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pod 数量</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pods}</div>
            <p className="text-xs text-muted-foreground">
              {stats.clusters > 0 ? `平均每集群 ${(stats.pods / stats.clusters).toFixed(1)} 个 Pod` : "无 Pod"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">服务数量</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.services}</div>
            <p className="text-xs text-muted-foreground">
              {stats.clusters > 0 ? `平均每集群 ${(stats.services / stats.clusters).toFixed(1)} 个服务` : "无服务"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clusters">
        <TabsList>
          <TabsTrigger value="clusters">集群状态</TabsTrigger>
          <TabsTrigger value="resources">资源监控</TabsTrigger>
          <TabsTrigger value="events">最近事件</TabsTrigger>
        </TabsList>
        <TabsContent value="clusters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>集群状态</CardTitle>
              <CardDescription>所有 Kubernetes 集群的当前状态</CardDescription>
            </CardHeader>
            <CardContent>
              {clusters.length === 0 ? (
                <div className="text-center py-6">
                  <Server className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-3 text-lg font-semibold">没有已配置的集群</h3>
                  <p className="mt-1 text-sm text-muted-foreground">添加您的第一个 Kubernetes 集群以开始管理</p>
                  <Button className="mt-4" asChild>
                    <a href="/dashboard/clusters">添加集群</a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {clusters.map((cluster) => (
                    <div key={cluster.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${getClusterStatusClass(cluster.status)}`}></div>
                        <div>
                          <h4 className="font-medium">{cluster.name}</h4>
                          <p className="text-sm text-muted-foreground">{cluster.description || "无描述"}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/dashboard/kubernetes?cluster=${cluster.id}`}>查看资源</a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>资源监控</CardTitle>
              <CardDescription>集群资源使用情况</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <div className="text-center">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-3 text-lg font-semibold">资源监控即将推出</h3>
                <p className="mt-1 text-sm text-muted-foreground">我们正在开发资源监控功能，敬请期待</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>最近事件</CardTitle>
              <CardDescription>系统和集群事件日志</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <div className="text-center">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-3 text-lg font-semibold">事件日志即将推出</h3>
                <p className="mt-1 text-sm text-muted-foreground">我们正在开发事件日志功能，敬请期待</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
