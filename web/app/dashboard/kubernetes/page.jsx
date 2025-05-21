"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RefreshCw, Filter, Terminal, Server, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { clustersAPI, kubernetesAPI } from "@/lib/api"
import { KubernetesTerminal } from "@/components/kubernetes-terminal"
import { PodsList } from "@/components/kubernetes/pods-list"
import { DeploymentsList } from "@/components/kubernetes/deployments-list"
import { ServicesList } from "@/components/kubernetes/services-list"
import { ConfigMapsList } from "@/components/kubernetes/config-maps-list"
import { ResourceDetails } from "@/components/kubernetes/resource-details"

export default function KubernetesPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTab, setSelectedTab] = useState("pods")
  const [showTerminal, setShowTerminal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [clusters, setClusters] = useState([])
  const [selectedCluster, setSelectedCluster] = useState(null)
  const [namespaces, setNamespaces] = useState([])
  const [selectedNamespace, setSelectedNamespace] = useState("default")
  const [resources, setResources] = useState({
    pods: [],
    deployments: [],
    services: [],
    configMaps: [],
  })
  const [selectedResource, setSelectedResource] = useState(null)

  // 从 URL 参数获取集群 ID
  useEffect(() => {
    const clusterIdFromUrl = searchParams.get("cluster")
    if (clusterIdFromUrl) {
      // 稍后会在集群加载后设置选中的集群
      localStorage.setItem("selectedClusterId", clusterIdFromUrl)
    }
  }, [searchParams])

  // 加载集群列表
  useEffect(() => {
    fetchClusters()
  }, [])

  // 获取集群列表
  const fetchClusters = async () => {
    setIsLoading(true)
    try {
      // 调用后端 API 获取集群列表
      const data = await clustersAPI.getAll()
      setClusters(data)

      // 从 URL 或本地存储中获取选中的集群 ID
      const savedClusterId = localStorage.getItem("selectedClusterId")
      if (savedClusterId) {
        const cluster = data.find((c) => c.id === savedClusterId)
        if (cluster) {
          setSelectedCluster(cluster)
        } else if (data.length > 0) {
          setSelectedCluster(data[0])
        }
      } else if (data.length > 0) {
        setSelectedCluster(data[0])
      }
    } catch (error) {
      toast({
        title: "获取集群列表失败",
        description: error.message,
        variant: "destructive",
      })
      // 如果 API 调用失败，尝试从本地存储加载（仅用于演示）
      const savedClusters = localStorage.getItem("k8s-clusters")
      if (savedClusters) {
        const parsedClusters = JSON.parse(savedClusters)
        setClusters(parsedClusters)

        // 从 URL 或本地存储中获取选中的集群 ID
        const savedClusterId = localStorage.getItem("selectedClusterId")
        if (savedClusterId) {
          const cluster = parsedClusters.find((c) => c.id === savedClusterId)
          if (cluster) {
            setSelectedCluster(cluster)
          } else if (parsedClusters.length > 0) {
            setSelectedCluster(parsedClusters[0])
          }
        } else if (parsedClusters.length > 0) {
          setSelectedCluster(parsedClusters[0])
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 获取命名空间列表
  useEffect(() => {
    if (selectedCluster) {
      fetchNamespaces()
    }
  }, [selectedCluster])

  // 获取命名空间列表
  const fetchNamespaces = async () => {
    if (!selectedCluster) return

    setIsLoading(true)
    try {
      // 调用后端 API 获取命名空间列表
      const resp = await kubernetesAPI.getNamespaces(selectedCluster.id)
      console.log("resp", resp)
      setNamespaces(resp.data)
    } catch (error) {
      toast({
        title: "获取命名空间失败",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 获取资源列表
  useEffect(() => {
    if (selectedCluster && selectedNamespace) {
      fetchResources()
    }
  }, [selectedTab, selectedCluster, selectedNamespace])

  // 获取资源列表
  const fetchResources = async () => {
    if (!selectedCluster || !selectedNamespace) return

    setIsLoading(true)
    try {
      let data

      // 根据选中的标签获取不同类型的资源
      switch (selectedTab) {
        case "pods":
          data = await kubernetesAPI.getPods(selectedCluster.id, selectedNamespace)
          setResources((prev) => ({ ...prev, pods: data.data }))
          break
        case "deployments":
          data = await kubernetesAPI.getDeployments(selectedCluster.id, selectedNamespace)
          setResources((prev) => ({ ...prev, deployments: data }))
          break
        case "services":
          data = await kubernetesAPI.getServices(selectedCluster.id, selectedNamespace)
          setResources((prev) => ({ ...prev, services: data }))
          break
        case "configmaps":
          data = await kubernetesAPI.getConfigMaps(selectedCluster.id, selectedNamespace)
          setResources((prev) => ({ ...prev, configMaps: data }))
          break
      }
    } catch (error) {
      toast({
        title: `获取${getResourceTypeLabel()}失败`,
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 获取资源类型标签
  const getResourceTypeLabel = () => {
    switch (selectedTab) {
      case "pods":
        return "Pod"
      case "deployments":
        return "Deployment"
      case "services":
        return "Service"
      case "configmaps":
        return "ConfigMap"
      default:
        return "资源"
    }
  }

  // 过滤资源
  const getFilteredResources = (resourceType) => {
    const resourceList = resources[resourceType] || []
    if (!searchTerm) return resourceList

    return resourceList.filter(
      (resource) =>
        resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (resource.namespace && resource.namespace.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (resource.status && resource.status.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }

  // 处理集群变更
  const handleClusterChange = (clusterId) => {
    const cluster = clusters.find((c) => c.id === clusterId)
    setSelectedCluster(cluster)
    setSelectedNamespace("default") // 切换集群时重置命名空间
    localStorage.setItem("selectedClusterId", clusterId)
  }

  // 处理命名空间变更
  const handleNamespaceChange = (namespace) => {
    setSelectedNamespace(namespace)
  }

  // 处理刷新
  const handleRefresh = () => {
    fetchResources()
  }

  // 查看资源详情
  const handleViewResourceDetails = (resourceType, resourceName) => {
    setSelectedResource({
      type: resourceType,
      name: resourceName,
    })
  }

  if (isLoading && !selectedCluster) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!clusters || clusters.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <Server className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-3 text-lg font-semibold">没有已配置的集群</h3>
            <p className="mt-1 text-sm text-muted-foreground">您需要先添加一个 Kubernetes 集群才能查看资源</p>
            <Button className="mt-4" asChild>
              <a href="/dashboard/clusters">
                <Plus className="mr-2 h-4 w-4" /> 添加集群
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <Select value={selectedCluster?.id} onValueChange={handleClusterChange}>
            <SelectTrigger className="w-full sm:w-[400px]">
              <SelectValue placeholder="选择集群" />
            </SelectTrigger>
            <SelectContent>
              {clusters.map((cluster) => (
                <SelectItem key={cluster.id} value={cluster.id}>
                  {cluster.cluster_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedNamespace} onValueChange={handleNamespaceChange}>
            <SelectTrigger className="w-full sm:w-[400px]">
              <SelectValue placeholder="选择命名空间" />
            </SelectTrigger>
            <SelectContent>
              {namespaces.map((ns) => (
                <SelectItem key={ns} value={ns}>
                  {ns}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索资源..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            筛选
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
          <Button size="sm" onClick={() => setShowTerminal(true)}>
            <Terminal className="h-4 w-4 mr-2" />
            终端
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pods" value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pods">Pods</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="configmaps">ConfigMaps</TabsTrigger>
        </TabsList>

        <TabsContent value="pods">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Pods</CardTitle>
              <CardDescription>管理 Kubernetes 集群中的 Pod 资源</CardDescription>
            </CardHeader>
            <CardContent>
              <PodsList
                clusterId={selectedCluster?.id}
                namespace={selectedNamespace}
                pods={getFilteredResources("pods")}
                isLoading={isLoading}
                onRefresh={handleRefresh}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployments">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Deployments</CardTitle>
              <CardDescription>管理 Kubernetes 集群中的 Deployment 资源</CardDescription>
            </CardHeader>
            <CardContent>
              <DeploymentsList
                clusterId={selectedCluster?.id}
                namespace={selectedNamespace}
                deployments={getFilteredResources("deployments")}
                isLoading={isLoading}
                onRefresh={handleRefresh}
                namespaces={namespaces}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Services</CardTitle>
              <CardDescription>管理 Kubernetes 集群中的 Service 资源</CardDescription>
            </CardHeader>
            <CardContent>
              <ServicesList
                clusterId={selectedCluster?.id}
                namespace={selectedNamespace}
                services={getFilteredResources("services")}
                isLoading={isLoading}
                onRefresh={handleRefresh}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configmaps">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>ConfigMaps</CardTitle>
              <CardDescription>管理 Kubernetes 集群中的 ConfigMap 资源</CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigMapsList
                clusterId={selectedCluster?.id}
                namespace={selectedNamespace}
                configMaps={getFilteredResources("configMaps")}
                isLoading={isLoading}
                onRefresh={handleRefresh}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 终端对话框 */}
      {showTerminal && (
        <Dialog open={showTerminal} onOpenChange={setShowTerminal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Kubernetes 终端</DialogTitle>
              <DialogDescription>执行命令与集群 {selectedCluster?.name} 交互</DialogDescription>
            </DialogHeader>
            <KubernetesTerminal clusterId={selectedCluster?.id} namespace={selectedNamespace} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTerminal(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 资源详情对话框 */}
      {selectedResource && (
        <Dialog open={!!selectedResource} onOpenChange={(open) => !open && setSelectedResource(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <ResourceDetails
              clusterId={selectedCluster?.id}
              namespace={selectedNamespace}
              resourceType={selectedResource.type}
              resourceName={selectedResource.name}
              onClose={() => setSelectedResource(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
