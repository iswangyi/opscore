'use client'
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const subMenus = [
  { key: "mysql", label: "MySQL 数据迁移", href: "/dashboard/datamigrate/mysql" },
  { key: "minio", label: "MinIO 数据迁移", href: "/dashboard/datamigrate/minio" },
  // 未来可扩展更多类型
];

export default function DataMigrateMenuPage() {
  const pathname = usePathname();
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">数据迁移</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subMenus.map((item) => (
          <Link key={item.key} href={item.href}>
            <Button variant={pathname === item.href ? "default" : "outline"} className="w-full h-24 text-lg">
              {item.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
} 