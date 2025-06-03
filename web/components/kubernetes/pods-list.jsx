"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { kubernetesAPI } from "@/lib/api"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

const PODS_PER_PAGE = 8;
// const MAX_INITIAL_PAGES = 10; // 移除此常量

export function PodsList({
  clusterId,
  namespace,
  initialPods = [],
  initialContinueToken = "",
  onRefresh,
  isLoading: initialIsLoading = false
}) {
  const { toast } = useToast()
  const [pods, setPods] = useState(Array.isArray(initialPods) ? initialPods : []) // Ensure initialPods is an array
  const [continueToken, setContinueToken] = useState(initialContinueToken)
  const [isLoading, setIsLoading] = useState(initialIsLoading)
  const [isDeleting, setIsDeleting] = useState(null) // Tracks which pod is being deleted
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setPods(Array.isArray(initialPods) ? initialPods : []); // Ensure initialPods is an array before setting
    setContinueToken(initialContinueToken);
    setCurrentPage(1); // Reset to first page when initial data changes
  }, [initialPods, initialContinueToken]);

  const handleDeleteResource = async (resourceName) => {
    if (!clusterId || !namespace) return
    setIsDeleting(resourceName);
    try {
      await kubernetesAPI.deleteResource(clusterId, namespace, "pods", resourceName)
      toast({
        title: "资源已删除",
        description: `${resourceName} 已成功删除`,
      })
      // Optimistically remove from list or call onRefresh to refetch everything
      setPods(prevPods => (Array.isArray(prevPods) ? prevPods : []).filter(p => p.name !== resourceName)); // Ensure prevPods is an array
      if (onRefresh) {
        // If onRefresh re-fetches the first page, it's better to call it
        // to ensure data consistency, especially if total count changes.
         onRefresh(); 
      }
    } catch (error) {
      toast({
        title: "删除资源失败",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null);
    }
  }

  // 查看 Pod 日志 (placeholder)
  const handleViewLogs = async (podName) => {
    toast({
      title: "正在获取日志",
      description: `正在获取 ${podName} 的日志...`,
    })
  }

  const handleLoadMore = async () => {
    if (!continueToken || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      // 请求下一批数据，每次请求 200 个
      const response = await kubernetesAPI.getPods(clusterId, namespace, 200, continueToken);
      if (response.code === 0 && response.data && Array.isArray(response.data.pods)) {
        setPods(prevPods => [...(Array.isArray(prevPods) ? prevPods : []), ...response.data.pods]);
        setContinueToken(response.data.continueToken);
        // 加载更多后，停留在当前页或跳转到新加载数据的第一页，这里选择停留在当前页
        // 如果需要跳转到新加载数据的第一页，可以使用: setCurrentPage(Math.floor(pods.length / PODS_PER_PAGE) + 1); 
      } else if (response.code === 0 && response.data && response.data.pods === null && response.data.continueToken !== undefined) {
        // Handle case where pods might be null (e.g. no more items) but continueToken might still be relevant or empty
        setContinueToken(response.data.continueToken);
        // Optionally, if pods is null and you expect an empty array for no more items:
        // setPods(prevPods => [...(Array.isArray(prevPods) ? prevPods : [])]); 
      } else {
        throw new Error(response.msg || "加载更多 Pod 失败或数据格式无效");
      }
    } catch (error) {
      toast({
        title: "加载更多 Pod 失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 状态徽章组件
  const StatusBadge = ({ status }) => {
    let variant = "outline"
    let icon = null
    if (status === "Running" || status === "Succeeded" || status === "Available") {
      variant = "success"
      icon = <CheckCircle2 className="h-3 w-3 mr-1" />
    } else if (status === "Pending") {
      variant = "warning"
      icon = <AlertTriangle className="h-3 w-3 mr-1" />
    } else if (status === "Failed" || status === "CrashLoopBackOff" || status === "Error") {
      variant = "destructive"
      icon = <XCircle className="h-3 w-3 mr-1" />
    }
    return (
      <Badge variant={variant} className="flex items-center whitespace-nowrap">
        {icon}
        {status}
      </Badge>
    )
  }

  // 计算当前页显示的 Pods
  const startIndex = (currentPage - 1) * PODS_PER_PAGE;
  const endIndex = startIndex + PODS_PER_PAGE;
  const currentPods = (Array.isArray(pods) ? pods : []).slice(startIndex, endIndex);

  // 计算总页数 (基于当前已加载的 Pods)
  const totalPages = Math.ceil(pods.length / PODS_PER_PAGE);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>命名空间</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="hidden md:table-cell" >节点</TableHead>
            <TableHead className="hidden md:table-cell">CPU</TableHead>
            <TableHead className="hidden md:table-cell">内存</TableHead>
            <TableHead className="hidden lg:table-cell">重启次数</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && pods.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                <span className="mt-2 block">加载中...</span>
              </TableCell>
            </TableRow>
          ) : !isLoading && pods.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                未找到匹配的 Pod 资源
              </TableCell>
            </TableRow>
          ) : (
            currentPods.map((pod) => ( // 使用 currentPods 进行渲染
              <TableRow key={pod.name}>
                <TableCell className="font-medium break-all">{pod.name}</TableCell>
                <TableCell>{pod.namespace}</TableCell>
                <TableCell>
                  <StatusBadge status={pod.status} />
                </TableCell>
                <TableCell className="hidden md:table-cell">{pod.nodename || "N/A"}</TableCell>
                <TableCell className="hidden md:table-cell">{pod.cpu}</TableCell>
                <TableCell className="hidden md:table-cell">{pod.memory}</TableCell>
                <TableCell className="hidden lg:table-cell">{pod.restartCount}</TableCell>
                <TableCell>{pod.age}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={isDeleting === pod.name}>
                        {isDeleting === pod.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewLogs(pod.name)}>查看日志</DropdownMenuItem>
                      <DropdownMenuItem>进入终端</DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteResource(pod.name)}
                        disabled={isDeleting === pod.name}
                        className="text-red-600"
                      >
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* 分页控件和“加载更多”按钮 */}
      <div className="flex justify-between items-center py-4 px-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink 
                  isActive={currentPage === i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>

        {/* 只有当已加载的 Pod 数量达到 200 且存在 continueToken 时才显示“加载更多”按钮 */}
        {pods.length >= 200 && continueToken && (
          <Button onClick={handleLoadMore} disabled={isLoadingMore || isLoading}>
            {isLoadingMore ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载中...</>
            ) : (
              "加载更多"
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
