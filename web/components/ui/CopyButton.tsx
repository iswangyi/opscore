import * as React from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  copiedText?: string
  copyLabel?: string
  successLabel?: string
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  copiedText = "已复制到剪贴板",
  copyLabel = "复制",
  successLabel = "已复制",
  variant = "outline",
  size = "icon",
  ...props
}) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (!value) return
    let success = false
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(value)
        success = true
      } catch {
        success = false
      }
    }
    if (!success) {
      // fallback for insecure context
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        success = true
      } catch {
        success = false
      }
      document.body.removeChild(textarea)
    }
    if (success) {
      setCopied(true)
      toast({ title: successLabel, description: copiedText })
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast({ title: "复制失败", description: "请手动复制内容", variant: "destructive" })
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={copied ? successLabel : copyLabel}
      onClick={handleCopy}
      {...props}
    >
      {copied ? <Check className="text-green-500" /> : <Copy />}
    </Button>
  )
}