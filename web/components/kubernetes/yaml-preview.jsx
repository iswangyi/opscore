"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CopyButton } from "@/components/ui/CopyButton"
import { Download, X } from "lucide-react"

/**
 * YAML预览组件
 * @param {Object} props - 组件属性
 * @param {string} props.yaml - YAML内容
 * @param {string} props.title - 预览标题
 * @param {string} props.description - 预览描述
 * @param {string} props.filename - 下载文件名
 * @param {function} props.onClose - 关闭预览的回调函数
 * @returns {JSX.Element}
 */
export function YamlPreview({ yaml, title, description, filename, onClose }) {

  // 下载YAML文件
  const downloadYaml = () => {
    if (!yaml) return

    const blob = new Blob([yaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'export.yaml'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>{title || 'YAML预览'}</CardTitle>
          <CardDescription>{description || 'YAML资源定义预览'}</CardDescription>
        </div>
        <div className="flex space-x-2">
          <CopyButton value={yaml || ''} disabled={!yaml} title="复制YAML内容" />
          <Button
            variant="outline"
            size="icon"
            onClick={downloadYaml}
            disabled={!yaml}
            title="下载YAML文件"
          >
            <Download className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              title="关闭预览"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={yaml || '# 没有YAML内容'}
          readOnly
          className="font-mono text-sm h-96 resize-none"
        />
      </CardContent>
    </Card>
  )
}