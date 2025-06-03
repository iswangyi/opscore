'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { clustersAPI, kubernetesAPI } from '@/lib/api';
import { Download, FileJson, Package, List, RefreshCw, AlertCircle, Eye, X } from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';
import { Checkbox } from '@/components/ui/checkbox';
import { YamlPreview } from '@/components/kubernetes/yaml-preview';

export default function AdvancedKubernetesPage() {
  const { toast } = useToast();
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [exportedYaml, setExportedYaml] = useState('');
  const [imageList, setImageList] = useState([]);
  const [packagingProgress, setPackagingProgress] = useState(0);
  const [isPackaging, setIsPackaging] = useState(false);
  const [packageUrl, setPackageUrl] = useState('');

  const [activeTab, setActiveTab] = useState('export-yaml');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [packageTaskId, setPackageTaskId] = useState('');
  const [packageStatus, setPackageStatus] = useState('');

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

  const [selectedResourceTypes, setSelectedResourceTypes] = useState({
    deployments: true,
    statefulsets: true,
    services: true,
    secrets: true,
    pvcs: false,
    pvs: false,
    cronjobs: false,
    jobs: false
  });

  // 导出当前命名空间所有 YAML
  const exportAllYaml = async () => {
    if (!selectedCluster || !selectedNamespace) {
      toast({
        title: '无法导出 YAML',
        description: '请先选择集群和命名空间',
        variant: 'destructive'
      });
      return;
    }

    // 检查是否至少选择了一种资源类型
    const hasSelectedTypes = Object.values(selectedResourceTypes).some((value) => value);
    if (!hasSelectedTypes) {
      toast({
        title: '无法导出 YAML',
        description: '请至少选择一种资源类型',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setExportedYaml('');
    try {
      // 调用后端 API 导出 YAML
      const response = await kubernetesAPI.exportNamespaceYaml(
        selectedCluster.id,
        selectedNamespace,
        Object.keys(selectedResourceTypes).filter((key) => selectedResourceTypes[key])
      );

      // 如果有YAML内容，则设置YAML内容并显示预览
      if (response.data) {
        setExportedYaml(response.data.join('\n---\n'));
        setPreviewVisible(true);

        toast({
          title: 'YAML 导出成功',
          description: `已导出命名空间 ${selectedNamespace} 的所选资源`
        });
      } else {
        setExportedYaml('# 没有资源');
        toast({
          title: '未找到资源',
          description: '所选命名空间中没有符合条件的资源',
          variant: 'warning'
        });
      }
    } catch (error) {
      toast({
        title: '导出 YAML 失败',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  const yamlFilterImageName = () => {
    if (!exportedYaml) {
      return;
    }
    const lines = exportedYaml.split('\n');
    const filteredLines = lines.filter((line) => {
      return line.trim().startsWith('image: ');
    });

    // 提取镜像名称并去重
    const uniqueImageNames = [...new Set(filteredLines.map((line) => line.trim().replace('image: ', '')))];
    const a = uniqueImageNames.map((imageName) => {
      const cmd1 = 'docker pull ' + imageName;
      const imageFileName = imageName.replaceAll(":", '_').replaceAll("/", '_');
      const cmd2 = 'docker save -o ' + imageFileName + '.tar ' + imageName;
      return cmd1 + '\n' + cmd2;
    });

    setImageList(a);
  };

  // 提取镜像列表
  const extractImageList = async () => {
    if (!selectedCluster || !selectedNamespace) {
      toast({
        title: '无法提取镜像列表',
        description: '请先选择集群和命名空间',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setImageList([]);
    try {
      // 调用后端 API 提取镜像列表
      const response = await kubernetesAPI.getNamespaceImages(selectedCluster.id, selectedNamespace);
      setImageList(response.images || []);
      toast({
        title: '镜像列表提取成功',
        description: `已提取命名空间 ${selectedNamespace} 的所有镜像`
      });
    } catch (error) {
      toast({
        title: '提取镜像列表失败',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 下载 YAML 文件
  const downloadYaml = () => {
    if (!exportedYaml) return;

    const blob = new Blob([exportedYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedNamespace}-resources.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 下载镜像列表
  const downloadImageList = () => {
    if (imageList.length === 0) return;

    const content = imageList.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedNamespace}-images.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Kubernetes 高级功能</h2>
        <p className="text-muted-foreground">导出 YAML、提取镜像列表和打包镜像等高级运维功能</p>
      </div>

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="export-yaml">导出 YAML</TabsTrigger>
          <TabsTrigger value="naspace-migration">命名空间迁移</TabsTrigger>
          <TabsTrigger value="etcd-backup">etcd备份</TabsTrigger>
          <TabsTrigger value="cluster-cert-update">集群证书续期</TabsTrigger>
          <TabsTrigger value="version-upgrade">集群版本升级</TabsTrigger>
        </TabsList>

        {/* 导出 YAML 标签页 */}
        <TabsContent value="export-yaml" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>导出当前命名空间所有 YAML</CardTitle>
              <CardDescription>导出所选命名空间中的所有 Kubernetes 资源的 YAML 定义</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>选择资源类型</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="deployments"
                        checked={selectedResourceTypes.deployments}
                        onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, deployments: !!checked })}
                      />
                      <label htmlFor="deployments" className="text-sm font-medium">
                        Deployments
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="statefulsets"
                        checked={selectedResourceTypes.statefulsets}
                        onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, statefulsets: !!checked })}
                      />
                      <label htmlFor="statefulsets" className="text-sm font-medium">
                        StatefulSets
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="services" checked={selectedResourceTypes.services} onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, services: !!checked })} />
                      <label htmlFor="services" className="text-sm font-medium">
                        Services
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="secrets" checked={selectedResourceTypes.secrets} onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, secrets: !!checked })} />
                      <label htmlFor="secrets" className="text-sm font-medium">
                        Secrets
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="pvcs" checked={selectedResourceTypes.pvcs} onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, pvcs: !!checked })} />
                      <label htmlFor="pvcs" className="text-sm font-medium">
                        PVCs
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="pvs" checked={selectedResourceTypes.pvs} onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, pvs: !!checked })} />
                      <label htmlFor="pvs" className="text-sm font-medium">
                        PVs
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cronjobs" checked={selectedResourceTypes.cronjobs} onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, cronjobs: !!checked })} />
                      <label htmlFor="cronjobs" className="text-sm font-medium">
                        CronJobs
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="jobs" checked={selectedResourceTypes.jobs} onCheckedChange={(checked) => setSelectedResourceTypes({ ...selectedResourceTypes, jobs: !!checked })} />
                      <label htmlFor="jobs" className="text-sm font-medium">
                        Jobs
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={exportAllYaml} disabled={isLoading || !selectedCluster || !selectedNamespace}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      导出中...
                    </>
                  ) : (
                    <>
                      <FileJson className="mr-2 h-4 w-4" />
                      导出 YAML
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={() => setPreviewVisible(true)} disabled={isLoading || !selectedCluster || !selectedNamespace || !exportedYaml}>
                  <Eye className="mr-2 h-4 w-4" />
                  预览 YAML
                </Button>
                <Button variant="outline" onClick={yamlFilterImageName} disabled={isLoading || !selectedCluster || !selectedNamespace || !exportedYaml}>
                  生成镜像打包命令
                </Button>

                {exportedYaml && (
                  <div className="space-x-2">
                    <CopyButton text={imageList.join('\n')} variant="outline" size="icon" label="复制镜像命令" />
                    <Button variant="outline" size="icon" onClick={downloadYaml}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* YAML 预览对话框 */}
              {previewVisible && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-background rounded-lg">
                    <YamlPreview
                      yaml={exportedYaml}
                      title={`${selectedNamespace} 命名空间资源 YAML`}
                      description={`包含所选资源类型的 YAML 定义`}
                      filename={`${selectedNamespace}-resources.yaml`}
                      onClose={() => setPreviewVisible(false)}
                    />
                  </div>
                </div>
              )}

              {<Textarea value={imageList.join('\n')} readOnly placeholder="点击导出 YAML按钮导出当前命名空间的所有资源" className="font-mono h-96" />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 提取镜像列表标签页 */}
        <TabsContent value="extract-images" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>提取镜像列表</CardTitle>
              <CardDescription>从所选命名空间中提取所有使用的容器镜像列表</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <Button onClick={extractImageList} disabled={isLoading || !selectedCluster || !selectedNamespace}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      提取中...
                    </>
                  ) : (
                    <>
                      <List className="mr-2 h-4 w-4" />
                      提取镜像列表
                    </>
                  )}
                </Button>
                {imageList.length > 0 && (
                  <Button variant="outline" onClick={downloadImageList}>
                    <Download className="mr-2 h-4 w-4" />
                    下载列表
                  </Button>
                )}
              </div>
              {imageList.length > 0 ? (
                <div className="border rounded-md p-4 max-h-96 overflow-y-auto">
                  <p className="text-sm text-muted-foreground mb-2">共找到 {imageList.length} 个镜像</p>
                  <ul className="space-y-2">
                    {imageList.map((image, index) => (
                      <li key={index} className="flex items-center justify-between p-2 border-b last:border-0">
                        <span className="font-mono text-sm">{image}</span>
                        <CopyButton text={image} variant="ghost" size="icon" label="复制镜像命令" />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="border rounded-md p-8 text-center">
                  <List className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">点击"提取镜像列表"按钮获取当前命名空间使用的所有容器镜像</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
