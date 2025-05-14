"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export default function HomePage() {
  const router = useRouter()

  // 自动重定向到仪表盘页面
  useEffect(() => {
    // 使用短暂延迟确保组件已完全挂载
    const timer = setTimeout(() => {
      router.push("/dashboard")
    }, 100)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[300px]">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-center mb-4">正在加载 DevOps 管理系统...</p>
          <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full">
            手动跳转到仪表盘
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
