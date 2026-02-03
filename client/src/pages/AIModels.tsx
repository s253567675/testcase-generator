import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Bot, Check, CheckCircle2, Edit, Loader2, Play, Plus, Star, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ModelFormData {
  name: string;
  provider: string;
  modelId: string;
  apiUrl: string;
  apiKey: string;
}

const defaultProviders = [
  { value: "deepseek", label: "DeepSeek", defaultUrl: "https://api.deepseek.com/v1/chat/completions", defaultModel: "deepseek-chat" },
  { value: "openai", label: "OpenAI", defaultUrl: "https://api.openai.com/v1/chat/completions", defaultModel: "gpt-4" },
  { value: "anthropic", label: "Anthropic", defaultUrl: "https://api.anthropic.com/v1/messages", defaultModel: "claude-3-sonnet-20240229" },
  { value: "custom", label: "自定义 (OpenAI兼容)", defaultUrl: "", defaultModel: "" },
];

export default function AIModels() {
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [testingModelId, setTestingModelId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string }>>({});
  const [formData, setFormData] = useState<ModelFormData>({
    name: "",
    provider: "deepseek",
    modelId: "deepseek-chat",
    apiUrl: "https://api.deepseek.com/v1/chat/completions",
    apiKey: "",
  });

  const utils = trpc.useUtils();
  const { data: models, isLoading } = trpc.aiModel.list.useQuery();
  const { data: defaultModel } = trpc.aiModel.getDefault.useQuery();

  const createMutation = trpc.aiModel.create.useMutation({
    onSuccess: () => {
      toast.success("AI模型添加成功");
      utils.aiModel.list.invalidate();
      utils.aiModel.getDefault.invalidate();
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "添加失败");
    },
  });

  const updateMutation = trpc.aiModel.update.useMutation({
    onSuccess: () => {
      toast.success("AI模型更新成功");
      utils.aiModel.list.invalidate();
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "更新失败");
    },
  });

  const deleteMutation = trpc.aiModel.delete.useMutation({
    onSuccess: () => {
      toast.success("AI模型已删除");
      utils.aiModel.list.invalidate();
      utils.aiModel.getDefault.invalidate();
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "删除失败");
    },
  });

  const setDefaultMutation = trpc.aiModel.setDefault.useMutation({
    onSuccess: () => {
      toast.success("已设为默认模型");
      utils.aiModel.list.invalidate();
      utils.aiModel.getDefault.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "设置失败");
    },
  });

  const testConnectionMutation = trpc.aiModel.testConnection.useMutation({
    onSuccess: (result, variables) => {
      setTestResults((prev) => ({
        ...prev,
        [variables.id]: { success: result.success, message: result.message },
      }));
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setTestingModelId(null);
    },
    onError: (error, variables) => {
      setTestResults((prev) => ({
        ...prev,
        [variables.id]: { success: false, message: error.message || "测试失败" },
      }));
      toast.error(error.message || "测试失败");
      setTestingModelId(null);
    },
  });

  const handleTestConnection = (modelId: number) => {
    setTestingModelId(modelId);
    // 清除之前的测试结果
    setTestResults((prev) => {
      const newResults = { ...prev };
      delete newResults[modelId];
      return newResults;
    });
    testConnectionMutation.mutate({ id: modelId });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      provider: "deepseek",
      modelId: "deepseek-chat",
      apiUrl: "https://api.deepseek.com/v1/chat/completions",
      apiKey: "",
    });
  };

  const handleProviderChange = (provider: string) => {
    const providerConfig = defaultProviders.find((p) => p.value === provider);
    setFormData({
      ...formData,
      provider,
      apiUrl: providerConfig?.defaultUrl || "",
      modelId: providerConfig?.defaultModel || "",
    });
  };

  const openEditDialog = (model: any) => {
    setSelectedModel(model);
    setFormData({
      name: model.name,
      provider: model.provider,
      modelId: model.modelId,
      apiUrl: model.apiUrl,
      apiKey: "", // 不显示原有的API Key
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (model: any) => {
    setSelectedModel(model);
    setDeleteDialogOpen(true);
  };

  const handleCreate = () => {
    if (!formData.name || !formData.provider || !formData.modelId || !formData.apiUrl || !formData.apiKey) {
      toast.error("请填写所有必填字段");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedModel) return;
    const updateData: any = {
      id: selectedModel.id,
      name: formData.name,
      provider: formData.provider,
      modelId: formData.modelId,
      apiUrl: formData.apiUrl,
    };
    // 只有填写了新的API Key才更新
    if (formData.apiKey) {
      updateData.apiKey = formData.apiKey;
    }
    updateMutation.mutate(updateData);
  };

  const getProviderLabel = (provider: string) => {
    const config = defaultProviders.find((p) => p.value === provider);
    return config?.label || provider;
  };

  const getTestStatusBadge = (modelId: number) => {
    const result = testResults[modelId];
    if (!result) return null;
    
    if (result.success) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 ml-2">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          连接正常
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 ml-2" title={result.message}>
          <XCircle className="h-3 w-3 mr-1" />
          连接失败
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI模型管理</h1>
          <p className="text-muted-foreground">
            配置和管理用于生成测试用例的AI模型
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          添加模型
        </Button>
      </div>

      {/* 当前默认模型 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            当前默认模型
          </CardTitle>
          <CardDescription>
            AI生成测试用例时将优先使用此模型
          </CardDescription>
        </CardHeader>
        <CardContent>
          {defaultModel ? (
            <div className="flex items-center gap-4">
              <Bot className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{defaultModel.name}</p>
                <p className="text-sm text-muted-foreground">
                  {getProviderLabel(defaultModel.provider)} - {defaultModel.modelId}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">未设置默认模型，将使用内置模型</p>
          )}
        </CardContent>
      </Card>

      {/* 模型列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !models || models.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无自定义模型</h3>
            <p className="text-muted-foreground mb-4">添加您自己的AI模型以获得更好的生成效果</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              添加模型
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">名称</TableHead>
                    <TableHead className="w-[120px]">提供商</TableHead>
                    <TableHead className="w-[180px]">模型ID</TableHead>
                    <TableHead>API地址</TableHead>
                    <TableHead className="w-[100px]">状态</TableHead>
                    <TableHead className="w-[200px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model: any) => (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {model.name}
                          {model.isDefault === 1 && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                          {getTestStatusBadge(model.id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getProviderLabel(model.provider)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {model.modelId}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {model.apiUrl}
                      </TableCell>
                      <TableCell>
                        {model.isSystem === 1 ? (
                          <Badge variant="secondary">系统</Badge>
                        ) : (
                          <Badge variant="outline">自定义</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleTestConnection(model.id)}
                            disabled={testingModelId === model.id}
                            title="测试连接"
                          >
                            {testingModelId === model.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDefaultMutation.mutate({ id: model.id })}
                            disabled={model.isDefault === 1}
                            title="设为默认"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(model)}
                            title="编辑"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(model)}
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 添加模型对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加AI模型</DialogTitle>
            <DialogDescription>
              配置新的AI模型用于生成测试用例
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">模型名称</Label>
              <Input
                id="name"
                placeholder="例如：DeepSeek V3"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">提供商</Label>
              <Select value={formData.provider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue placeholder="选择提供商" />
                </SelectTrigger>
                <SelectContent>
                  {defaultProviders.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelId">模型ID</Label>
              <Input
                id="modelId"
                placeholder="例如：deepseek-chat"
                value={formData.modelId}
                onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiUrl">API地址</Label>
              <Input
                id="apiUrl"
                placeholder="https://api.example.com/v1/chat/completions"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑模型对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑AI模型</DialogTitle>
            <DialogDescription>
              修改AI模型配置
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">模型名称</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-provider">提供商</Label>
              <Select value={formData.provider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue placeholder="选择提供商" />
                </SelectTrigger>
                <SelectContent>
                  {defaultProviders.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-modelId">模型ID</Label>
              <Input
                id="edit-modelId"
                value={formData.modelId}
                onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-apiUrl">API地址</Label>
              <Input
                id="edit-apiUrl"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-apiKey">API Key (留空则不修改)</Label>
              <Input
                id="edit-apiKey"
                type="password"
                placeholder="留空则保持原有Key"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除模型 "{selectedModel?.name}" 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedModel && deleteMutation.mutate({ id: selectedModel.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
