// ... existing code ...
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // 假设您有 Textarea 组件
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { kubernetesAPI } from "@/lib/api"; // 假设 API 调用在这里处理
import { useToast } from "@/hooks/use-toast";

export function AddClusterDialog({ onSuccess }) {
  const { toast } = useToast();
  const [clusterName, setClusterName] = useState("");
  const [comment, setComment] = useState("");
  const [kubeConfig, setKubeConfig] = useState(""); // 用于绑定 textarea 的值
  const [isLoading, setIsLoading] = useState(false);

  // 移除处理文件上传的函数，例如 handleFileChange

  const handleSubmit = async () => {
    if (!clusterName.trim() || !kubeConfig.trim()) {
      toast({
        title: "错误",
        description: "集群名称和 KubeConfig 不能为空。",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const clusterData = {
        cluster_name: clusterName,
        comment: comment,
        kube_config: kubeConfig, // 直接使用 textarea 的内容
      };
      // 假设这是您的 API 调用函数
      await kubernetesAPI.add(clusterData); 
      toast({
        title: "成功",
        description: "集群已成功添加。",
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "添加集群失败",
        description: error.message || "发生未知错误。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* ... 其他表单字段如 ClusterName, Comment ... */}
      <div className="grid gap-2">
        <Label htmlFor="cluster-name">集群名称</Label>
        <Input
          id="cluster-name"
          value={clusterName}
          onChange={(e) => setClusterName(e.target.value)}
          placeholder="例如：my-production-cluster"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="comment">备注 (可选)</Label>
        <Input
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="例如：生产环境主集群"
        />
      </div>

      {/* 将文件输入替换为 Textarea */}
      <div className="grid gap-2">
        <Label htmlFor="kubeconfig">KubeConfig</Label>
        <Textarea
          id="kubeconfig"
          value={kubeConfig}
          onChange={(e) => setKubeConfig(e.target.value)}
          placeholder="在此处粘贴您的 KubeConfig YAML 内容..."
          rows={10} // 您可以根据需要调整行数
          className="font-mono" // 可选：使用等宽字体以获得更好的 KubeConfig 可读性
        />
      </div>
      
      <Button onClick={handleSubmit} disabled={isLoading} className="mt-4">
        {isLoading ? "添加中..." : "添加集群"}
      </Button>
    </div>
  );
}
// ... existing code ...