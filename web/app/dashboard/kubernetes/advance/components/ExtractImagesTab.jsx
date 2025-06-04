'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { kubernetesAPI } from '@/lib/api';
import { Download, List, RefreshCw } from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';

export default function ExtractImagesTab({ selectedCluster, selectedNamespace, isLoading, setIsLoading }) {
  const { toast } = useToast();
  const [imageList, setImageList] = useState([]);

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
    <div className="space-y-4">
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
    </div>
  );
}
