"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { kubernetesAPI } from "@/lib/api"

export function KubernetesTerminal({ clusterId, namespace = "default" }) {
  const { toast } = useToast()
  const [command, setCommand] = useState("")
  const [history, setHistory] = useState([])
  const [currentNamespace, setCurrentNamespace] = useState(namespace)
  const terminalRef = useRef(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [namespaces, setNamespaces] = useState([
    { name: "default" },
    { name: "kube-system" },
    { name: "kube-public" },
    { name: "production" },
    { name: "monitoring" },
  ])

  // 更新命名空间
  useEffect(() => {
    setCurrentNamespace(namespace)
  }, [namespace])

  // 获取命名空间列表
  useEffect(() => {
    if (clusterId) {
      fetchNamespaces()
    }
  }, [clusterId])

  // 获取命名空间列表
  const fetchNamespaces = async () => {
    try {
      const data = await kubernetesAPI.getNamespaces(clusterId)
      setNamespaces(data)
    } catch (error) {
      console.error("获取命名空间失败:", error)
      // 保留默认命名空间列表
    }
  }

  // 自动滚动到底部
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  // 执行命令
  const executeCommand = async () => {
    if (!command.trim()) return
    if (!clusterId) {
      toast({
        title: "无法执行命令",
        description: "未选择集群",
        variant: "destructive",
      })
      return
    }

    setIsExecuting(true)
    const fullCommand = command.trim()

    // 添加命令到历史记录
    setHistory([...history, { command: `$ ${fullCommand}`, output: "执行中...", isLoading: true }])

    try {
      // 调用后端 API 执行命令
      const result = await kubernetesAPI.executeCommand(clusterId, currentNamespace, fullCommand)

      // 更新历史记录
      setHistory((prev) =>
        prev.map((item, index) =>
          index === prev.length - 1 ? { command: item.command, output: result.output, isLoading: false } : item,
        ),
      )
    } catch (error) {
      // 更新历史记录
      setHistory((prev) =>
        prev.map((item, index) =>
          index === prev.length - 1
            ? { command: item.command, output: error.message, isLoading: false, isError: true }
            : item,
        ),
      )

      toast({
        title: "命令执行失败",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsExecuting(false)
      setCommand("")
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !isExecuting) {
      executeCommand()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={currentNamespace} onValueChange={setCurrentNamespace}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="命名空间" />
          </SelectTrigger>
          <SelectContent>
            {namespaces.map((ns) => (
              <SelectItem key={ns.name} value={ns.name}>
                {ns.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={executeCommand} disabled={isExecuting || !command.trim()}>
          执行
        </Button>
      </div>

      <div ref={terminalRef} className="bg-black text-green-400 font-mono p-4 rounded-md h-80 overflow-y-auto">
        {history.length === 0 ? (
          <div className="text-gray-500">
            # 在当前命名空间 ({currentNamespace}) 中执行命令
            <br /># 例如: get pods, get deployments, describe pod [name]
            <br /># 输入 'help' 获取更多信息
          </div>
        ) : (
          history.map((item, index) => (
            <div key={index} className="mb-2">
              <div className="text-white">{item.command}</div>
              <pre className={`whitespace-pre-wrap text-sm ${item.isError ? "text-red-400" : ""}`}>
                {item.isLoading ? <span className="animate-pulse">执行中...</span> : item.output}
              </pre>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-muted-foreground">$</span>
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入命令，例如: get pods"
          className="font-mono"
          disabled={isExecuting}
        />
      </div>
    </div>
  )
}
