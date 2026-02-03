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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Bot, Download, FileText, Loader2, MoreHorizontal, Plus, Sparkles, Trash2, Upload, Wand2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

export default function Documents() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [generateMode, setGenerateMode] = useState<"template" | "ai">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: documents, isLoading } = trpc.document.list.useQuery();
  const { data: templates } = trpc.template.list.useQuery();
  const { data: aiModels } = trpc.aiModel.list.useQuery();
  const { data: defaultModel } = trpc.aiModel.getDefault.useQuery();

  const uploadMutation = trpc.document.upload.useMutation({
    onSuccess: () => {
      toast.success("文档上传成功，正在解析...");
      utils.document.list.invalidate();
      setUploadDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "上传失败");
    },
  });

  const deleteMutation = trpc.document.delete.useMutation({
    onSuccess: () => {
      toast.success("文档已删除");
      utils.document.list.invalidate();
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "删除失败");
    },
  });

  const generateTemplateMutation = trpc.testCase.generateWithTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(`成功生成 ${data.count} 条测试用例`);
      utils.testCase.list.invalidate();
      utils.stats.executionStats.invalidate();
      utils.history.list.invalidate();
      setGenerateDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "生成失败");
    },
  });

  const generateAIMutation = trpc.testCase.generateWithAI.useMutation({
    onSuccess: (data: any) => {
      toast.success(`AI成功生成 ${data.count} 条测试用例 (使用模型: ${data.modelName})`);
      utils.testCase.list.invalidate();
      utils.stats.executionStats.invalidate();
      utils.history.list.invalidate();
      setGenerateDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "AI生成失败");
    },
  });

  const handleDownload = async (docId: number) => {
    setDownloadingId(docId);
    try {
      const result = await utils.client.document.download.query({ id: docId });
      if (result.url) {
        const link = document.createElement("a");
        link.href = result.url;
        link.download = result.fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("文档下载已开始");
      }
    } catch (error: any) {
      toast.error(error.message || "下载失败");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const allowedTypes = ["docx", "doc", "pdf", "md", "txt"];
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "";

      if (!allowedTypes.includes(fileExt)) {
        toast.error("不支持的文件格式，请上传 Word、PDF、Markdown 或纯文本文件");
        return;
      }

      setUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1];
          await uploadMutation.mutateAsync({
            fileName: file.name,
            fileType: fileExt,
            fileData: base64,
          });
          setUploading(false);
        };
        reader.onerror = () => {
          toast.error("文件读取失败");
          setUploading(false);
        };
        reader.readAsDataURL(file);
      } catch {
        setUploading(false);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [uploadMutation]
  );

  const handleGenerate = () => {
    if (!selectedDocument) return;

    if (generateMode === "ai") {
      const modelId = selectedModelId && selectedModelId !== "default" ? parseInt(selectedModelId) : undefined;
      generateAIMutation.mutate({ documentId: selectedDocument, modelId });
    } else {
      generateTemplateMutation.mutate({
        documentId: selectedDocument,
        templateId: selectedTemplate && selectedTemplate !== "default" ? parseInt(selectedTemplate) : undefined,
      });
    }
  };

  const openGenerateDialog = (docId: number) => {
    setSelectedDocument(docId);
    setGenerateMode("template");
    setSelectedTemplate("");
    setSelectedModelId("");
    setGenerateDialogOpen(true);
  };

  const openDeleteDialog = (docId: number) => {
    setSelectedDocument(docId);
    setDeleteDialogOpen(true);
  };

  const isGenerating = generateTemplateMutation.isPending || generateAIMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">需求文档</h1>
          <p className="text-muted-foreground">上传需求文档并生成测试用例</p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          上传文档
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !documents || documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无文档</h3>
            <p className="text-muted-foreground text-center mb-4">
              上传需求文档开始生成测试用例
            </p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              上传第一个文档
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate" title={doc.fileName}>
                        {doc.fileName}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(doc.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDownload(doc.id)}
                        disabled={downloadingId === doc.id}
                      >
                        {downloadingId === doc.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        下载文档
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openGenerateDialog(doc.id)}
                        disabled={doc.status !== "parsed"}
                      >
                        <Wand2 className="h-4 w-4 mr-2" />
                        生成测试用例
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(doc.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      doc.status === "parsed"
                        ? "bg-green-100 text-green-700"
                        : doc.status === "parsing"
                        ? "bg-yellow-100 text-yellow-700"
                        : doc.status === "error"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {doc.status === "parsed"
                      ? "已解析"
                      : doc.status === "parsing"
                      ? "解析中..."
                      : doc.status === "error"
                      ? "解析失败"
                      : "已上传"}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownload(doc.id)}
                      disabled={downloadingId === doc.id}
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                    </Button>
                    {doc.status === "parsed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openGenerateDialog(doc.id)}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        生成用例
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 上传对话框 */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传需求文档</DialogTitle>
            <DialogDescription>
              支持 Word (.docx)、PDF、Markdown (.md)、纯文本 (.txt) 格式
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.pdf,.md,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            >
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">上传中...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium">点击选择文件</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    或将文件拖放到此处
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 生成对话框 */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>生成测试用例</DialogTitle>
            <DialogDescription>选择生成方式来创建测试用例</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-3">
              <Label>生成方式</Label>
              <RadioGroup
                value={generateMode}
                onValueChange={(v) => setGenerateMode(v as "template" | "ai")}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="template" id="template" className="peer sr-only" />
                  <Label
                    htmlFor="template"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Wand2 className="mb-3 h-6 w-6" />
                    <span className="font-medium">模板生成</span>
                    <span className="text-xs text-muted-foreground mt-1">基于预设模板</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="ai" id="ai" className="peer sr-only" />
                  <Label
                    htmlFor="ai"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Sparkles className="mb-3 h-6 w-6" />
                    <span className="font-medium">AI生成</span>
                    <span className="text-xs text-muted-foreground mt-1">智能分析文档</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {generateMode === "template" && templates && templates.length > 0 && (
              <div className="space-y-2">
                <Label>选择模板（可选）</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="使用默认模板" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">使用默认模板</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {generateMode === "ai" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  选择AI模型
                </Label>
                <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                  <SelectTrigger>
                    <SelectValue placeholder={defaultModel ? `默认: ${defaultModel.name}` : "使用内置模型"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      {defaultModel ? `默认: ${defaultModel.name}` : "使用内置模型"}
                    </SelectItem>
                    {aiModels && aiModels.map((model: any) => (
                      <SelectItem key={model.id} value={model.id.toString()}>
                        {model.name} ({model.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  可在"AI模型管理"页面添加更多模型，如DeepSeek、OpenAI等
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                "开始生成"
              )}
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
              删除文档将同时删除基于该文档生成的所有测试用例，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedDocument && deleteMutation.mutate({ id: selectedDocument })}
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
