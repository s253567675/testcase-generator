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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Edit, FileText, Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TemplateCase = {
  scenario: string;
  precondition: string;
  steps: string[];
  expectedResult: string;
  priority: "P0" | "P1" | "P2" | "P3";
  caseType: "functional" | "boundary" | "exception" | "performance";
};

type Template = {
  id: number;
  name: string;
  description: string | null;
  moduleType: string | null;
  templateContent: TemplateCase[];
  isSystem: number;
  createdAt: Date;
};

const defaultCase: TemplateCase = {
  scenario: "",
  precondition: "",
  steps: [""],
  expectedResult: "",
  priority: "P1",
  caseType: "functional",
};

export default function Templates() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    moduleType: "",
    cases: [{ ...defaultCase }] as TemplateCase[],
  });

  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.template.list.useQuery();

  const createMutation = trpc.template.create.useMutation({
    onSuccess: () => {
      toast.success("模板创建成功");
      utils.template.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "创建失败");
    },
  });

  const updateMutation = trpc.template.update.useMutation({
    onSuccess: () => {
      toast.success("模板更新成功");
      utils.template.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "更新失败");
    },
  });

  const deleteMutation = trpc.template.delete.useMutation({
    onSuccess: () => {
      toast.success("模板已删除");
      utils.template.list.invalidate();
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "删除失败");
    },
  });

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      moduleType: "",
      cases: [{ ...defaultCase }],
    });
    setSelectedTemplate(null);
    setIsEditing(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (template: Template) => {
    setSelectedTemplate(template);
    setIsEditing(true);
    setForm({
      name: template.name,
      description: template.description || "",
      moduleType: template.moduleType || "",
      cases: template.templateContent || [{ ...defaultCase }],
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("请输入模板名称");
      return;
    }
    if (form.cases.length === 0 || !form.cases.some((c) => c.scenario.trim())) {
      toast.error("请至少添加一个测试用例");
      return;
    }

    const validCases = form.cases.filter((c) => c.scenario.trim());

    if (isEditing && selectedTemplate) {
      updateMutation.mutate({
        id: selectedTemplate.id,
        name: form.name,
        description: form.description || undefined,
        moduleType: form.moduleType || undefined,
        templateContent: validCases,
      });
    } else {
      createMutation.mutate({
        name: form.name,
        description: form.description || undefined,
        moduleType: form.moduleType || undefined,
        templateContent: validCases,
      });
    }
  };

  const addCase = () => {
    setForm({ ...form, cases: [...form.cases, { ...defaultCase }] });
  };

  const removeCase = (index: number) => {
    if (form.cases.length <= 1) return;
    setForm({ ...form, cases: form.cases.filter((_, i) => i !== index) });
  };

  const updateCase = (index: number, field: keyof TemplateCase, value: any) => {
    const newCases = [...form.cases];
    newCases[index] = { ...newCases[index], [field]: value };
    setForm({ ...form, cases: newCases });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">测试用例模板</h1>
          <p className="text-muted-foreground">管理可复用的测试用例模板</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          新建模板
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !templates || templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无模板</h3>
            <p className="text-muted-foreground text-center mb-4">
              创建测试用例模板以便快速生成用例
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个模板
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.name}
                      {template.isSystem === 1 && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          系统
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {template.description || "无描述"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(template as Template)}>
                        <Edit className="h-4 w-4 mr-2" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedTemplate(template as Template);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive"
                        disabled={template.isSystem === 1}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{template.moduleType || "通用"}</span>
                  <span>{template.templateContent?.length || 0} 个用例</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "编辑模板" : "新建模板"}</DialogTitle>
            <DialogDescription>
              定义测试用例模板，用于快速生成测试用例
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>模板名称 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如：登录功能测试模板"
                />
              </div>
              <div className="space-y-2">
                <Label>适用模块</Label>
                <Input
                  value={form.moduleType}
                  onChange={(e) => setForm({ ...form, moduleType: e.target.value })}
                  placeholder="例如：登录、表单、搜索"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>模板描述</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="描述此模板的用途和适用场景"
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base">测试用例列表</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCase}>
                  <Plus className="h-4 w-4 mr-1" />
                  添加用例
                </Button>
              </div>

              <div className="space-y-6">
                {form.cases.map((tc, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">用例 {index + 1}</span>
                      {form.cases.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCase(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">测试场景 *</Label>
                        <Input
                          value={tc.scenario}
                          onChange={(e) => updateCase(index, "scenario", e.target.value)}
                          placeholder="测试场景描述"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">前置条件</Label>
                        <Input
                          value={tc.precondition}
                          onChange={(e) => updateCase(index, "precondition", e.target.value)}
                          placeholder="前置条件"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">测试步骤（每行一个）</Label>
                      <Textarea
                        value={tc.steps.join("\n")}
                        onChange={(e) =>
                          updateCase(index, "steps", e.target.value.split("\n"))
                        }
                        placeholder="步骤1&#10;步骤2&#10;步骤3"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">预期结果 *</Label>
                      <Input
                        value={tc.expectedResult}
                        onChange={(e) => updateCase(index, "expectedResult", e.target.value)}
                        placeholder="预期结果"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">优先级</Label>
                        <Select
                          value={tc.priority}
                          onValueChange={(v) => updateCase(index, "priority", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="P0">P0 - 最高</SelectItem>
                            <SelectItem value="P1">P1 - 高</SelectItem>
                            <SelectItem value="P2">P2 - 中</SelectItem>
                            <SelectItem value="P3">P3 - 低</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">用例类型</Label>
                        <Select
                          value={tc.caseType}
                          onValueChange={(v) => updateCase(index, "caseType", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="functional">功能测试</SelectItem>
                            <SelectItem value="boundary">边界测试</SelectItem>
                            <SelectItem value="exception">异常测试</SelectItem>
                            <SelectItem value="performance">性能测试</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "保存中..." : "保存"}
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
              确定要删除模板 "{selectedTemplate?.name}" 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTemplate && deleteMutation.mutate({ id: selectedTemplate.id })}
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
