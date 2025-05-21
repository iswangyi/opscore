"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { kubernetesAPI } from "@/lib/api"

export function ConfigMapsList({ clusterId, namespace, configMaps, isLoading, onRefresh }) {
  const { toast } = useToast()

  // 处理资源删除
  const handleDeleteResource = async (resourceName) => {
    if (!clusterId || !namespace) return

    try {
      // 调用后端 API 删除资源
      await kubernetesAPI.deleteResource(clusterId, namespace, "configmaps", resourceName)

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

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>命名空间</TableHead>
            <TableHead>数据</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                <span className="mt-2 block">加载中...</span>
              </TableCell>
            </TableRow>
          ) : configMaps.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                未找到匹配的 ConfigMap 资源
              </TableCell>
            </TableRow>
          ) : (
            configMaps.map((configMap) => (
              <TableRow key={configMap.name}>
                <TableCell className="font-medium">{configMap.name}</TableCell>
                <TableCell>{configMap.namespace}</TableCell>
                <TableCell>{configMap.data}</TableCell>
                <TableCell>{configMap.age}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleDeleteResource(configMap.name)}>删除</DropdownMenuItem>
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
