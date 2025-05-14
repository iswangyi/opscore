"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModeToggle } from "@/components/mode-toggle"
import {
  Home,
  LayoutDashboard,
  Server,
  Database,
  Cloud,
  Settings,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Layers,
} from "lucide-react"

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 关闭移动菜单当路径改变时
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // 导航项
  const navItems = [
    {
      title: "仪表盘",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "集群管理",
      href: "/dashboard/clusters",
      icon: Server,
    },
    {
      title: "Kubernetes",
      href: "/dashboard/kubernetes",
      icon: Layers,
    },
    {
      title: "VMware",
      href: "/dashboard/vmware",
      icon: Database,
    },
    {
      title: "云服务器",
      href: "/dashboard/cloud",
      icon: Cloud,
    },
    {
      title: "设置",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              <span className="font-bold">DevOps 管理系统</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>个人资料</DropdownMenuItem>
                <DropdownMenuItem>设置</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/login">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        {/* 侧边导航 - 移动版 */}
        {isMobileMenuOpen && (
          <aside className="fixed inset-0 top-16 z-30 h-[calc(100vh-4rem)] w-full overflow-y-auto border-r bg-background p-6 md:hidden">
            <nav className="flex flex-col gap-2">
              {navItems.map((item, index) => (
                <Button
                  key={index}
                  variant={pathname === item.href ? "default" : "ghost"}
                  className="justify-start"
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-5 w-5" />
                    {item.title}
                  </Link>
                </Button>
              ))}
            </nav>
          </aside>
        )}

        {/* 侧边导航 - 桌面版 */}
        <aside className="fixed top-16 hidden h-[calc(100vh-4rem)] w-full overflow-y-auto border-r md:sticky md:block">
          <nav className="grid items-start px-4 py-6 lg:px-6">
            <div className="flex flex-col gap-2">
              {navItems.map((item, index) => (
                <Button
                  key={index}
                  variant={pathname === item.href ? "default" : "ghost"}
                  className="justify-start"
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-5 w-5" />
                    {item.title}
                  </Link>
                </Button>
              ))}
            </div>
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex w-full flex-col overflow-hidden p-6 md:py-8">{children}</main>
      </div>
    </div>
  )
}
