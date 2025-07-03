'use client';

import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { clustersAPI, kubernetesAPI } from '@/lib/api';

export default function ClusterNamespaceSelector({
  clusters,
  setClusters,
  selectedCluster,
  setSelectedCluster,
  namespaces,
  setNamespaces,
  selectedNamespace,
  setSelectedNamespace,
  isLoading,
  setIsLoading
}) {
  const { toast } = useToast();

  // 加载集群列表
  useEffect(() => {
    fetchClusters();
  }, []);

  // 获取集群列表
  const fetchClusters = async () => {
    setIsLoading(true);
    try {
      // 调用后端 API 获取集群列表
      const data = await clustersAPI.getAll();
      setClusters(data);

      // 从本地存储中获取选中的集群 ID
      const savedClusterId = localStorage.getItem('selectedClusterId');
      if (savedClusterId) {
        const cluster = data.find((c) => c.id === savedClusterId);
        if (cluster) {
          setSelectedCluster(cluster);
        } else if (data.length > 0) {
          setSelectedCluster(data[0]);
        }
      } else if (data.length > 0) {
        setSelectedCluster(data[0]);
      }
    } catch (error) {
      toast({
        title: '获取集群列表失败',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 获取命名空间列表
  useEffect(() => {
    if (selectedCluster) {
      fetchNamespaces();
    }
  }, [selectedCluster]);

  // 获取命名空间列表
  const fetchNamespaces = async () => {
    if (!selectedCluster) return;

    setIsLoading(true);
    try {
      // 调用后端 API 获取命名空间列表
      const resp = await kubernetesAPI.getNamespaces(selectedCluster.id);
      setNamespaces(resp.data || []);
    } catch (error) {
      toast({
        title: '获取命名空间失败',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
  );
}
