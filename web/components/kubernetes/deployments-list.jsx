"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreVertical, RefreshCw, Plus, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { kubernetesAPI } from "@/lib/api"

export function DeploymentsList({ clusterId, namespace, deployments, isLoading, onRefresh, namespaces = [] }) {
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [newDeployment, setNewDeployment] = useState({
    name: "",
    namespace: namespace,
    image: "",
    replicas: 1,
    yaml: "",
  })

  // 处理资源删除
  const handleDeleteResource = async (resourceName) => {
    if (!clusterId || !namespace) return

    try {
      // 调用后端 API 删除资源
      await kubernetesAPI.deleteResource(clusterId, namespace, "deployments", resourceName)

      // 刷新资源列表
      onRefresh()

      toast({
        title: "资源已删除",
        description: `${resourceName} 已成功删除`,
      })
    } catch (error) {
      toast({
        title: "删除资源失败",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // 创建 Deployment
  const handleCreateDeployment = async () => {
    if (!clusterId || !newDeployment.name || !newDeployment.image) {
      toast({
        title: "无法创建 Deployment",
        description: "请填写必要的信息",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      // 如果提供了 YAML，使用 YAML 创建
      if (newDeployment.yaml) {
        // 调用后端 API 创建资源
        await kubernetesAPI.createResource(clusterId, newDeployment.namespace, "deployments", {
          yaml: newDeployment.yaml,
        })
      } else {
        // 否则使用表单数据创建
        await kubernetesAPI.createResource(clusterId, newDeployment.namespace, "deployments", {
          name: newDeployment.name,
          image: newDeployment.image,
          replicas: newDeployment.replicas,
        })
      }

      // 刷新资源列表
      onRefresh()

      // 重置表单
      setNewDeployment({
        name: "",
        namespace: namespace,
        image: "",
        replicas: 1,
        yaml: "",
      })

      toast({
        title: "Deployment 已创建",
        description: `${newDeployment.name} 已成功创建`,
      })
    } catch (error) {
      toast({
        title: "创建 Deployment 失败",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // 状态徽章组件
  const StatusBadge = ({ status }) => {
    let variant = "outline"
    let icon = null

    if (status === "Available") {
      variant = "success"
      icon = <CheckCircle2 className="h-3 w-3 mr-1" />
    } else if (status === "Progressing") {
      variant = "warning"
      icon = <AlertTriangle className="h-3 w-3 mr-1" />
    } else if (status === "Degraded" || status === "Failed") {
      variant = "destructive"
      icon = <XCircle className="h-3 w-3 mr-1" />
    }

    return (
      <Badge variant={variant} className="flex items-center">
        {icon}
        {status}
      </Badge>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              创建 Deployment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建 Deployment</DialogTitle>
              <DialogDescription>填写以下信息创建新的 Deployment 资源</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="name">名称</label>
                <Input
                  id="name"
                  placeholder="my-deployment"
                  value={newDeployment.name}
                  onChange={(e) => setNewDeployment({ ...newDeployment, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="namespace">命名空间</label>
                <Select
                  value={newDeployment.namespace}
                  onValueChange={(value) => setNewDeployment({ ...newDeployment, namespace: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择命名空间" />
                  </SelectTrigger>
                  <SelectContent>
                    {namespaces.map((ns) => (
                      <SelectItem key={ns.name} value={ns.name}>
                        {ns.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="image">镜像</label>
                <Input
                  id="image"
                  placeholder="nginx:latest"
                  value={newDeployment.image}
                  onChange={(e) => setNewDeployment({ ...newDeployment, image: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="replicas">副本数</label>
                <Input
                  id="replicas"
                  type="number"
                  value={newDeployment.replicas}
                  min="1"
                  onChange={(e) =>
                    setNewDeployment({ ...newDeployment, replicas: Number.parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="yaml">YAML 配置 (可选)</label>
                <Textarea
                  id="yaml"
                  placeholder="apiVersion: apps/v1&#10;kind: Deployment&#10;metadata:&#10;  name: my-deployment&#10;..."
                  rows={8}
                  value={newDeployment.yaml}
                  onChange={(e) => setNewDeployment({ ...newDeployment, yaml: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  setNewDeployment({
                    name: "",
                    namespace: namespace,
                    image: "",
                    replicas: 1,
                    yaml: "",
                  })
                }
              >
                取消
              </Button>
              <Button onClick={handleCreateDeployment} disabled={isCreating}>
                {isCreating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>命名空间</TableHead>
              <TableHead>副本</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="hidden md:table-cell">镜像</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                  <span className="mt-2 block">加载中...</span>
                </TableCell>
              </TableRow>
            ) : deployments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                  未找到匹配的 Deployment 资源
                </TableCell>
              </TableRow>
            ) : (
              deployments.map((deployment) => (
                <TableRow key={deployment.name}>
                  <TableCell className="font-medium">{deployment.name}</TableCell>
                  <TableCell>{deployment.namespace}</TableCell>
                  <TableCell>{deployment.replicas}</TableCell>
                  <TableCell>
                    <StatusBadge status={deployment.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{deployment.image}</TableCell>
                  <TableCell>{deployment.age}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>查看详情</DropdownMenuItem>
                        <DropdownMenuItem>编辑</DropdownMenuItem>
                        <DropdownMenuItem>扩缩容</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteResource(deployment.name)}>删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
