"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Trash2, RefreshCw, Check, X, Server, MoreVertical, ExternalLink } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { clustersAPI } from "@/lib/api"

export default function ClustersPage() {
  const { toast } = useToast()
  const [clusters, setClusters] = useState([])
  const [isAddingCluster, setIsAddingCluster] = useState(false)
  const [newCluster, setNewCluster] = useState({
    name: "",
    description: "",
    kubeconfig: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [clusterToDelete, setClusterToDelete] = useState(null)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testResults, setTestResults] = useState({})

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
    } catch (error) {
      toast({
        title: "获取集群列表失败",
        description: error.message,
        variant: "destructive",
      })
      // 如果 API 调用失败，尝试从本地存储加载（仅用于演示）
      const savedClusters = localStorage.getItem("k8s-clusters")
      if (savedClusters) {
        setClusters(JSON.parse(savedClusters))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const content = event.target.result

          // 设置 kubeconfig 内容
          setNewCluster({
            ...newCluster,
            kubeconfig: content,
          })

          toast({
            title: "Kubeconfig 文件已加载",
            description: "文件已成功加载，准备添加集群",
          })
        } catch (error) {
          toast({
            title: "无效的 Kubeconfig 文件",
            description: error.message,
            variant: "destructive",
          })
        }
      }
      reader.readAsText(file)
    }
  }

  const handleAddCluster = async () => {
    if (!newCluster.name || !newCluster.kubeconfig) {
      toast({
        title: "无法添加集群",
        description: "集群名称和 Kubeconfig 文件是必需的",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // 调用后端 API 添加集群
      const addedCluster = await clustersAPI.add(newCluster)

      // 更新集群列表
      setClusters([...clusters, addedCluster])

      // 重置表单
      setNewCluster({ name: "", description: "", kubeconfig: null })
      setIsAddingCluster(false)

      toast({
        title: "集群已添加",
        description: `集群 "${addedCluster.name}" 已成功添加`,
      })

      // 保存到本地存储（仅用于演示）
      localStorage.setItem("k8s-clusters", JSON.stringify([...clusters, addedCluster]))
    } catch (error) {
      toast({
        title: "添加集群失败",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const deleteCluster = async (clusterId) => {
    try {
      // 调用后端 API 删除集群
      await clustersAPI.delete(clusterId)

      // 更新集群列表
      const updatedClusters = clusters.filter((cluster) => cluster.id !== clusterId)
      setClusters(updatedClusters)
      setClusterToDelete(null)

      toast({
        title: "集群已删除",
        description: "集群已从系统中移除",
      })

      // 更新本地存储（仅用于演示）
      localStorage.setItem("k8s-clusters", JSON.stringify(updatedClusters))
    } catch (error) {
      toast({
        title: "删除集群失败",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const testClusterConnection = async (cluster) => {
    const clusterId = cluster.id

    // 更新状态为测试中
    setClusters(clusters.map((c) => (c.id === clusterId ? { ...c, status: "testing" } : c)))

    setIsTestingConnection(true)
    setTestResults({ ...testResults, [clusterId]: { status: "testing" } })

    try {
      // 调用后端 API 测试集群连接
      const result = await clustersAPI.testConnection(clusterId)

      // 更新集群状态
      setClusters(clusters.map((c) => (c.id === clusterId ? { ...c, status: "connected" } : c)))

      // 更新测试结果
      setTestResults({
        ...testResults,
        [clusterId]: {
          status: "success",
          ...result,
        },
      })

      toast({
        title: "连接测试成功",
        description: `成功连接到集群 "${cluster.name}"`,
      })
    } catch (error) {
      // 更新集群状态为错误
      setClusters(clusters.map((c) => (c.id === clusterId ? { ...c, status: "error" } : c)))

      // 更新测试结果
      setTestResults({
        ...testResults,
        [clusterId]: {
          status: "error",
          message: error.message || "连接测试失败",
        },
      })

      toast({
        title: "连接测试失败",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "connected":
        return <Badge variant="success">已连接</Badge>
      case "error":
        return <Badge variant="destructive">连接错误</Badge>
      case "testing":
        return (
          <Badge variant="outline" className="animate-pulse">
            测试中...
          </Badge>
        )
      default:
        return <Badge variant="secondary">待连接</Badge>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kubernetes 集群管理</h2>
          <p className="text-muted-foreground">管理您的 Kubernetes 集群连接和配置</p>
        </div>
        <Button onClick={() => setIsAddingCluster(true)}>
          <Plus className="mr-2 h-4 w-4" /> 添加集群
        </Button>
      </div>

      {clusters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <Server className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-3 text-lg font-semibold">没有已配置的集群</h3>
            <p className="mt-1 text-sm text-muted-foreground">通过上传 kubeconfig 文件添加您的第一个 Kubernetes 集群</p>
            <Button className="mt-4" onClick={() => setIsAddingCluster(true)}>
              <Plus className="mr-2 h-4 w-4" /> 添加集群
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>集群名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="hidden md:table-cell">描述</TableHead>
                <TableHead className="hidden md:table-cell">添加时间</TableHead>
                <TableHead className="hidden md:table-cell">版本</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clusters.map((cluster) => (
                <TableRow key={cluster.id}>
                  <TableCell className="font-medium">{cluster.name}</TableCell>
                  <TableCell>{getStatusBadge(cluster.status)}</TableCell>
                  <TableCell className="hidden md:table-cell">{cluster.description || "-"}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatDate(cluster.addedAt)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {testResults[cluster.id]?.version || cluster.version || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => testClusterConnection(cluster)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          测试连接
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`/dashboard/kubernetes?cluster=${cluster.id}`} className="flex items-center">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            查看资源
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setClusterToDelete(cluster)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除集群
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Cluster Dialog */}
      <Dialog open={isAddingCluster} onOpenChange={setIsAddingCluster}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>添加 Kubernetes 集群</DialogTitle>
            <DialogDescription>上传 kubeconfig 文件以连接到您的 Kubernetes 集群</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cluster-name">集群名称</Label>
              <Input
                id="cluster-name"
                placeholder="生产集群"
                value={newCluster.name}
                onChange={(e) => setNewCluster({ ...newCluster, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cluster-description">描述 (可选)</Label>
              <Input
                id="cluster-description"
                placeholder="生产环境 Kubernetes 集群"
                value={newCluster.description}
                onChange={(e) => setNewCluster({ ...newCluster, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kubeconfig">Kubeconfig 文件</Label>
              <Input id="kubeconfig" type="file" accept=".yaml,.yml,.json,.txt" onChange={handleFileChange} />
              <p className="text-sm text-muted-foreground">上传包含集群连接信息的 kubeconfig 文件</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingCluster(false)}>
              取消
            </Button>
            <Button onClick={handleAddCluster} disabled={isUploading}>
              {isUploading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              添加集群
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Cluster Confirmation */}
      <AlertDialog open={!!clusterToDelete} onOpenChange={() => setClusterToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除集群</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除集群 "{clusterToDelete?.name}" 吗？此操作无法撤销，但不会影响实际的 Kubernetes 集群。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteCluster(clusterToDelete?.id)}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Connection Test Results */}
      {Object.keys(testResults).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>连接测试结果</CardTitle>
            <CardDescription>最近的集群连接测试结果</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(testResults).map(([clusterId, result]) => {
                const cluster = clusters.find((c) => c.id === clusterId)
                if (!cluster) return null

                return (
                  <div key={clusterId} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {result.status === "success" ? (
                          <Check className="mr-2 h-5 w-5 text-green-500" />
                        ) : result.status === "error" ? (
                          <X className="mr-2 h-5 w-5 text-red-500" />
                        ) : (
                          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        )}
                        <div>
                          <h4 className="font-medium">{cluster.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {result.status === "success"
                              ? "连接成功"
                              : result.status === "error"
                                ? "连接失败"
                                : "测试中..."}
                          </p>
                        </div>
                      </div>
                      {result.status === "success" && (
                        <Badge variant="outline" className="ml-auto">
                          {result.version}
                        </Badge>
                      )}
                    </div>

                    {result.status === "success" && (
                      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">节点数</p>
                          <p className="font-medium">{result.nodes}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pod 数</p>
                          <p className="font-medium">{result.pods}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">命名空间数</p>
                          <p className="font-medium">{result.namespaces}</p>
                        </div>
                      </div>
                    )}

                    {result.status === "error" && (
                      <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
                        {result.message}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
