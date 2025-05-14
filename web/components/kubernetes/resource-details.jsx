"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Copy, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { kubernetesAPI } from "@/lib/api"

export function ResourceDetails({ clusterId, namespace, resourceType, resourceName, onClose }) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [resourceDetails, setResourceDetails] = useState(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [copied, setCopied] = useState(false)

  // 获取资源详情
  useEffect(() => {
    if (clusterId && namespace && resourceType && resourceName) {
      fetchResourceDetails()
    }
  }, [clusterId, namespace, resourceType, resourceName])

  // 获取资源详情
  const fetchResourceDetails = async () => {
    setIsLoading(true)
    try {
      // 调用后端 API 获取资源详情
      const data = await kubernetesAPI.getResourceDetails(clusterId, namespace, resourceType, resourceName)
      setResourceDetails(data)
    } catch (error) {
      toast({
        title: "获取资源详情失败",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 复制 YAML
  const copyYaml = () => {
    if (resourceDetails?.yaml) {
      navigator.clipboard.writeText(resourceDetails.yaml)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2">加载资源详情...</p>
        </CardContent>
      </Card>
    )
  }

  if (!resourceDetails) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p>无法加载资源详情</p>
          <Button className="mt-4" onClick={onClose}>
            关闭
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              {resourceName}
              <Badge variant="outline">{resourceType}</Badge>
            </CardTitle>
            <CardDescription>命名空间: {namespace}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="yaml">YAML</TabsTrigger>
            {resourceType === "pods" && <TabsTrigger value="logs">日志</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(resourceDetails.metadata || {}).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm font-medium text-muted-foreground">{key}</p>
                  <p className="mt-1">{typeof value === "object" ? JSON.stringify(value) : value}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="yaml">
            <div className="relative">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={copyYaml}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Textarea value={resourceDetails.yaml} readOnly className="font-mono text-sm h-96" />
            </div>
          </TabsContent>

          {resourceType === "pods" && (
            <TabsContent value="logs">
              <Textarea value={resourceDetails.logs || "暂无日志数据"} readOnly className="font-mono text-sm h-96" />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}
