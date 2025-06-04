'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { kubernetesAPI } from '@/lib/api';
import { Package, RefreshCw } from 'lucide-react';
import ResourceTypeSelector from './ResourceTypeSelector';

export default function ResourceMigrationTab({ clusters, selectedResourceTypes, setSelectedResourceTypes, isLoading, setIsLoading }) {
  const { toast } = useToast();
  const [sourceCluster, setSourceCluster] = useState(null);
  const [destinationCluster, setDestinationCluster] = useState(null);
  const [migrationResults, setMigrationResults] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [sourceNamespaces, setSourceNamespaces] = useState([]);
  const [sourceNamespace, setSourceNamespace] = useState('');
  const [destNamespaces, setDestNamespaces] = useState([]);
  const [destNamespace, setDestNamespace] = useState('');
  
  // 当源集群变化时，获取该集群的命名空间列表
  useEffect(() => {
    if (!sourceCluster) return;
    
    const fetchSourceNamespaces = async () => {
      try {
        const response = await kubernetesAPI.getNamespaces(sourceCluster.id);
        setSourceNamespaces(response.data);
        if (response.length > 0) {
          setSourceNamespace(response[0]);
        } else {
          setSourceNamespace('');
        }
      } catch (error) {
        toast({
          title: '获取源集群命名空间列表失败',
          description: error.message,
          variant: 'destructive'
        });
        setSourceNamespaces([]);
        setSourceNamespace('');
      }
    };
    
    fetchSourceNamespaces();
  }, [sourceCluster, toast]);
  
  // 当目标集群变化时，获取该集群的命名空间列表
  useEffect(() => {
    if (!destinationCluster) return;
    
    const fetchDestNamespaces = async () => {
      try {
        const response = await kubernetesAPI.getNamespaces(destinationCluster.id);
        setDestNamespaces(response.data);
        if (response.length > 0) {
          setDestNamespace(response[0]);
        } else {
          setDestNamespace('');
        }
      } catch (error) {
        toast({
          title: '获取目标集群命名空间列表失败',
          description: error.message,
          variant: 'destructive'
        });
        setDestNamespaces([]);
        setDestNamespace('');
      }
    };
    
    fetchDestNamespaces();
  }, [destinationCluster, toast]);

  // 添加资源迁移函数
  const migrateResources = async () => {
    if (!sourceCluster || !destinationCluster || !sourceNamespace || !destNamespace) {
      toast({
        title: '无法迁移资源',
        description: '请先选择源集群、目标集群和命名空间',
        variant: 'destructive'
      });
      return;
    }

    // 检查源集群和目标集群是否相同
    if (sourceCluster.id === destinationCluster.id) {
      toast({
        title: '无法迁移资源',
        description: '源集群和目标集群不能相同',
        variant: 'destructive'
      });
      return;
    }

    // 检查是否至少选择了一种资源类型
    const hasSelectedTypes = Object.values(selectedResourceTypes).some((value) => value);
    if (!hasSelectedTypes) {
      toast({
        title: '无法迁移资源',
        description: '请至少选择一种资源类型',
        variant: 'destructive'
      });
      return;
    }

    setIsMigrating(true);
    setMigrationResults(null);
    try {
      // 调用后端 API 迁移资源
      const response = await kubernetesAPI.migrateResources(
        sourceCluster.id,
        destinationCluster.id,
        sourceNamespace,
        destNamespace,
        Object.keys(selectedResourceTypes).filter((key) => selectedResourceTypes[key])
      );

      // 设置迁移结果
      setMigrationResults(response.data || {});

      // 检查是否有成功迁移的资源
      const hasSuccessfulMigrations = Object.values(response.data || {}).some((typeResults) => Object.values(typeResults).some((result) => result.success));

      if (hasSuccessfulMigrations) {
        toast({
          title: '资源迁移成功',
          description: `已将命名空间 ${sourceNamespace} 的所选资源迁移到目标集群`
        });
      } else {
        toast({
          title: '资源迁移失败',
          description: '所有资源迁移均失败，请查看详细结果',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: '资源迁移失败',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>跨集群资源迁移</CardTitle>
          <CardDescription>将所选命名空间中的资源从源集群迁移到目标集群</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="source-cluster">源集群</Label>
              <Select
                value={sourceCluster?.id}
                onValueChange={(value) => {
                  const cluster = clusters.find((c) => c.id === value);
                  setSourceCluster(cluster);
                }}
                disabled={isMigrating || clusters.length === 0}
              >
                <SelectTrigger id="source-cluster">
                  <SelectValue placeholder="选择源集群" />
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
              <Label htmlFor="destination-cluster">目标集群</Label>
              <Select
                value={destinationCluster?.id}
                onValueChange={(value) => {
                  const cluster = clusters.find((c) => c.id === value);
                  setDestinationCluster(cluster);
                }}
                disabled={isMigrating || clusters.length === 0}
              >
                <SelectTrigger id="destination-cluster">
                  <SelectValue placeholder="选择目标集群" />
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
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="source-namespace">源命名空间</Label>
              <Select
                value={sourceNamespace}
                onValueChange={setSourceNamespace}
                disabled={isMigrating || !sourceCluster || sourceNamespaces.length === 0}
              >
                <SelectTrigger id="source-namespace">
                  <SelectValue placeholder="选择源命名空间" />
                </SelectTrigger>
                <SelectContent>
                  {sourceNamespaces.map((ns) => (
                    <SelectItem key={ns} value={ns}>
                      {ns}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dest-namespace">目标命名空间</Label>
              <Select
                value={destNamespace}
                onValueChange={setDestNamespace}
                disabled={isMigrating || !destinationCluster || destNamespaces.length === 0}
              >
                <SelectTrigger id="dest-namespace">
                  <SelectValue placeholder="选择目标命名空间" />
                </SelectTrigger>
                <SelectContent>
                  {destNamespaces.map((ns) => (
                    <SelectItem key={ns} value={ns}>
                      {ns}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mb-4">
            <ResourceTypeSelector selectedResourceTypes={selectedResourceTypes} setSelectedResourceTypes={setSelectedResourceTypes} idPrefix="migrate-" />
          </div>

          <div className="flex space-x-2">
            <Button onClick={migrateResources} disabled={isMigrating || !sourceCluster || !destinationCluster || !sourceNamespace || !destNamespace}>
              {isMigrating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  迁移中...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  开始迁移
                </>
              )}
            </Button>
          </div>

          {migrationResults && (
            <div className="border rounded-md p-4 mt-4">
              <h3 className="text-lg font-medium mb-2">迁移结果</h3>
              {Object.entries(migrationResults).map(([resourceType, resources]) => (
                <div key={resourceType} className="mb-4">
                  <h4 className="font-medium mb-2 capitalize">{resourceType}</h4>
                  <div className="space-y-2">
                    {Object.entries(resources).length > 0 ? (
                      Object.entries(resources).map(([resourceName, result]) => (
                        <div key={resourceName} className={`p-2 rounded-md ${result.success ? 'bg-green-0 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm">{resourceName}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{result.success ? '成功' : '失败'}</span>
                          </div>
                          {!result.success && <p className="text-xs text-red-600 mt-1">{result.message}</p>}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">没有{resourceType}类型的资源</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
