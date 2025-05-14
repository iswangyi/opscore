"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { kubernetesAPI } from "@/lib/api"

export function ServicesList({ clusterId, namespace, services, isLoading, onRefresh }) {
  const { toast } = useToast()

  // 处理资源删除
  const handleDeleteResource = async (resourceName) => {
    if (!clusterId || !namespace) return

    try {
      // 调用后端 API 删除资源
      await kubernetesAPI.deleteResource(clusterId, namespace, "services", resourceName)

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
            <TableHead>类型</TableHead>
            <TableHead className="hidden md:table-cell">集群 IP</TableHead>
            <TableHead className="hidden md:table-cell">外部 IP</TableHead>
            <TableHead>端口</TableHead>
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
          ) : services.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                未找到匹配的 Service 资源
              </TableCell>
            </TableRow>
          ) : (
            services.map((service) => (
              <TableRow key={service.name}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell>{service.namespace}</TableCell>
                <TableCell>
                  <Badge variant="outline">{service.type}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{service.clusterIP}</TableCell>
                <TableCell className="hidden md:table-cell">{service.externalIP || "-"}</TableCell>
                <TableCell>{service.ports}</TableCell>
                <TableCell>{service.age}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleDeleteResource(service.name)}>删除</DropdownMenuItem>
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
