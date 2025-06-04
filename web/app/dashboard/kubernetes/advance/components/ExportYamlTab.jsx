'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { kubernetesAPI } from '@/lib/api';
import { Download, FileJson, RefreshCw, Eye } from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';
import { YamlPreview } from '@/components/kubernetes/yaml-preview';
import ResourceTypeSelector from './ResourceTypeSelector';

export default function ExportYamlTab({ selectedCluster, selectedNamespace, selectedResourceTypes, setSelectedResourceTypes, isLoading, setIsLoading }) {
  const { toast } = useToast();
  const [exportedYaml, setExportedYaml] = useState('');
  const [imageList, setImageList] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);

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
    const Lines = lines.filter((line) => {
      return line.trim().startsWith('image: ') || line.trim().startsWith('- image: ');
    });
    // 将 - image: 替换为 image:
    const filteredLines = Lines.map((line) => line.replace('- image: ', 'image: '));

    // 提取镜像名称并去重
    const uniqueImageNames = [...new Set(filteredLines.map((line) => line.trim().replace('image: ', '')))];
    const a = uniqueImageNames.map((imageName) => {
      const cmd1 = 'docker pull ' + imageName;
      const imageFileName = imageName.replaceAll(':', '_').replaceAll('/', '_');
      const cmd2 = 'docker save -o ' + imageFileName + '.tar ' + imageName;
      return cmd1 + '\n' + cmd2;
    });

    setImageList(a);
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>导出当前命名空间所有 YAML</CardTitle>
          <CardDescription>导出所选命名空间中的所有 Kubernetes 资源的 YAML 定义</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <ResourceTypeSelector selectedResourceTypes={selectedResourceTypes} setSelectedResourceTypes={setSelectedResourceTypes} />
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
    </div>
  );
}
