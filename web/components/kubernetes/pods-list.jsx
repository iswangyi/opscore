"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { kubernetesAPI } from "@/lib/api"

export function PodsList({ clusterId, namespace, pods, isLoading, onRefresh }) {
  const { toast } = useToast()
  const [expandedPod, setExpandedPod] = useState(null)

  // 处理资源删除
  const handleDeleteResource = async (resourceName) => {
    if (!clusterId || !namespace) return

    try {
      // 调用后端 API 删除资源
      await kubernetesAPI.deleteResource(clusterId, namespace, "pods", resourceName)

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

  // 查看 Pod 日志
  const handleViewLogs = async (podName) => {
    try {
      toast({
        title: "正在获取日志",
        description: `正在获取 ${podName} 的日志...`,
      })

      // 实际项目中应该跳转到日志页面或打开日志对话框
    } catch (error) {
      toast({
        title: "获取日志失败",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // 状态徽章组件
  const StatusBadge = ({ status }) => {
    let variant = "outline"
    let icon = null

    if (status === "Running" || status === "Available") {
      variant = "success"
      icon = <CheckCircle2 className="h-3 w-3 mr-1" />
    } else if (status === "Degraded" || status === "Pending") {
      variant = "warning"
      icon = <AlertTriangle className="h-3 w-3 mr-1" />
    } else if (status === "CrashLoopBackOff" || status === "Failed") {
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>命名空间</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="hidden md:table-cell">节点</TableHead>
            <TableHead className="hidden md:table-cell">CPU</TableHead>
            <TableHead className="hidden md:table-cell">内存</TableHead>
            <TableHead>存活时间</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                <span className="mt-2 block">加载中...</span>
              </TableCell>
            </TableRow>
          ) : pods.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                未找到匹配的 Pod 资源
              </TableCell>
            </TableRow>
          ) : (
            pods.map((pod) => (
              <TableRow key={pod.name}>
                <TableCell className="font-medium">{pod.name}</TableCell>
                <TableCell>{pod.namespace}</TableCell>
                <TableCell>
                  <StatusBadge status={pod.status} />
                </TableCell>
                <TableCell className="hidden md:table-cell">{pod.node}</TableCell>
                <TableCell className="hidden md:table-cell">{pod.cpu}</TableCell>
                <TableCell className="hidden md:table-cell">{pod.memory}</TableCell>
                <TableCell>{pod.age}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setExpandedPod(pod.name === expandedPod ? null : pod.name)}>
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewLogs(pod.name)}>查看日志</DropdownMenuItem>
                      <DropdownMenuItem>进入终端</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteResource(pod.name)}>删除</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
