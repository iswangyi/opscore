'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { clustersAPI, kubernetesAPI } from '@/lib/api';

// 导入拆分后的组件
import ExportYamlTab from './components/ExportYamlTab';
import ResourceMigrationTab from './components/ResourceMigrationTab';
import ExtractImagesTab from './components/ExtractImagesTab';
import EtcdBackupTab from './components/EtcdBackupTab';

export default function AdvancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // 获取当前活动的标签
  const activeTab = searchParams.get('tab') || 'export-yaml';

  // 状态管理
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 添加资源类型选择状态
  const [selectedResourceTypes, setSelectedResourceTypes] = useState({
    deployments: true,
    statefulsets: true,
    services: true,
    configmaps: true,
    secrets: true,
    pvcs: false,
    pvs: false,
    cronjobs: false,
    jobs: false
  });

  // 获取集群列表
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const response = await clustersAPI.getAll();
        setClusters(response);
        if (response.length > 0) {
          setSelectedCluster(response[0]);
        }
      } catch (error) {
        toast({
          title: '获取集群列表失败',
          description: error.message,
          variant: 'destructive'
        });
      }
    };

    fetchClusters();
  }, [toast]);

  // 当选择的集群变化时，获取命名空间列表
  useEffect(() => {
    const fetchNamespaces = async () => {
      if (!selectedCluster) return;

      try {
        const response = await kubernetesAPI.getNamespaces(selectedCluster.id);
        setNamespaces(response.data);
        if (response.length > 0) {
          setSelectedNamespace(response[0]);
        } else {
          setSelectedNamespace('');
        }
      } catch (error) {
        toast({
          title: '获取命名空间列表失败',
          description: error.message,
          variant: 'destructive'
        });
        setNamespaces([]);
        setSelectedNamespace('');
      }
    };

    fetchNamespaces();
  }, [selectedCluster, toast]);

  // 处理标签切换
  const handleTabChange = (value) => {
    // 更新URL参数以反映当前标签
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Kubernetes 高级功能</h2>
        <p className="text-muted-foreground">导出 YAML、提取镜像列表和打包镜像等高级运维功能</p>
      </div>

      {activeTab !== 'resource-migration' && (
        <Card>
          <CardHeader>
            <CardTitle>集群和命名空间选择</CardTitle>
            <CardDescription>选择要操作的 Kubernetes 集群和命名空间</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cluster">集群</Label>
                <Select
                  value={selectedCluster?.id}
                  onValueChange={(value) => {
                    const cluster = clusters.find((c) => c.id === value);
                    setSelectedCluster(cluster);
                    localStorage.setItem('selectedClusterId', value);
                  }}
                  disabled={isLoading || clusters.length === 0}
                >
                  <SelectTrigger id="cluster">
                    <SelectValue placeholder="选择集群" />
                  </SelectTrigger>
                  <SelectContent>
                    {clusters.map((cluster) => (
                      <SelectItem key={cluster.id} value={cluster.id}>
                        {cluster.cluster_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="namespace">命名空间</Label>
                <Select value={selectedNamespace} onValueChange={setSelectedNamespace} disabled={isLoading || !selectedCluster || namespaces.length === 0}>
                  <SelectTrigger id="namespace">
                    <SelectValue placeholder="选择命名空间" />
                  </SelectTrigger>
                  <SelectContent>
                    {namespaces.map((ns) => (
                      <SelectItem key={ns} value={ns}>
                        {ns}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="export-yaml">导出 YAML</TabsTrigger>
          <TabsTrigger value="resource-migration">跨集群资源迁移</TabsTrigger>
          <TabsTrigger value="extract-images">提取镜像列表</TabsTrigger>
          <TabsTrigger value="etcd-backup">etcd备份</TabsTrigger>
        </TabsList>

        {/* 导出 YAML 标签页 */}
        <TabsContent value="export-yaml" className="space-y-4">
          <ExportYamlTab
            selectedCluster={selectedCluster}
            selectedNamespace={selectedNamespace}
            selectedResourceTypes={selectedResourceTypes}
            setSelectedResourceTypes={setSelectedResourceTypes}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </TabsContent>

        {/* 跨集群资源迁移标签页 */}
        <TabsContent value="resource-migration" className="space-y-4">
          <ResourceMigrationTab
            clusters={clusters}
            selectedResourceTypes={selectedResourceTypes}
            setSelectedResourceTypes={setSelectedResourceTypes}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </TabsContent>

        {/* 提取镜像列表标签页 */}
        <TabsContent value="extract-images" className="space-y-4">
          <ExtractImagesTab selectedCluster={selectedCluster} selectedNamespace={selectedNamespace} isLoading={isLoading} setIsLoading={setIsLoading} />
        </TabsContent>

        {/* etcd备份标签页 */}
        <TabsContent value="etcd-backup" className="space-y-4">
          <EtcdBackupTab selectedCluster={selectedCluster} selectedNamespace={selectedNamespace} isLoading={isLoading} setIsLoading={setIsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
