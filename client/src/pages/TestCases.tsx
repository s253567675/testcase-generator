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
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Clock,
  Download,
  Edit,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TestCase = {
  id: number;
  caseNumber: string;
  module: string | null;
  scenario: string;
  precondition: string | null;
  steps: string[];
  expectedResult: string;
  priority: "P0" | "P1" | "P2" | "P3";
  caseType: "functional" | "boundary" | "exception" | "performance";
  executionStatus: "pending" | "passed" | "failed";
  executionResult: string | null;
  generationMode: "ai" | "template" | "import";
  createdAt: Date;
};

export default function TestCases() {
  const [keyword, setKeyword] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [editForm, setEditForm] = useState({
    scenario: "",
    module: "",
    precondition: "",
    steps: "",
    expectedResult: "",
    priority: "P1" as "P0" | "P1" | "P2" | "P3",
    caseType: "functional" as "functional" | "boundary" | "exception" | "performance",
    executionStatus: "pending" as "pending" | "passed" | "failed",
    executionResult: "",
  });

  const utils = trpc.useUtils();
  const { data: modules } = trpc.testCase.getModules.useQuery();
  const { data: testCases, isLoading } = trpc.testCase.search.useQuery({
    keyword: keyword || undefined,
    module: moduleFilter || undefined,
    priority: priorityFilter || undefined,
    executionStatus: statusFilter || undefined,
  });

  const updateMutation = trpc.testCase.update.useMutation({
    onSuccess: () => {
      toast.success("测试用例已更新");
      utils.testCase.search.invalidate();
      utils.stats.executionStats.invalidate();
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "更新失败");
    },
  });

  const deleteMutation = trpc.testCase.delete.useMutation({
    onSuccess: () => {
      toast.success("测试用例已删除");
      utils.testCase.search.invalidate();
      utils.stats.executionStats.invalidate();
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "删除失败");
    },
  });

  const exportMutation = trpc.testCase.export.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success(`已导出 ${data.count} 条测试用例`);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(error.message || "导出失败");
    },
  });

  const openEditDialog = (tc: TestCase) => {
    setSelectedCase(tc);
    setEditForm({
      scenario: tc.scenario,
      module: tc.module || "",
      precondition: tc.precondition || "",
      steps: Array.isArray(tc.steps) ? tc.steps.join("\n") : "",
      expectedResult: tc.expectedResult,
      priority: tc.priority,
      caseType: tc.caseType,
      executionStatus: tc.executionStatus,
      executionResult: tc.executionResult || "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedCase) return;
    updateMutation.mutate({
      id: selectedCase.id,
      scenario: editForm.scenario,
      module: editForm.module || undefined,
      precondition: editForm.precondition || undefined,
      steps: editForm.steps.split("\n").filter((s) => s.trim()),
      expectedResult: editForm.expectedResult,
      priority: editForm.priority,
      caseType: editForm.caseType,
      executionStatus: editForm.executionStatus,
      executionResult: editForm.executionResult || undefined,
    });
  };

  const handleExport = () => {
    if (selectedIds.length > 0) {
      exportMutation.mutate({ ids: selectedIds });
    } else {
      exportMutation.mutate({});
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!testCases) return;
    if (selectedIds.length === testCases.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(testCases.map((tc) => tc.id));
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      P0: "bg-red-100 text-red-700 border-red-200",
      P1: "bg-orange-100 text-orange-700 border-orange-200",
      P2: "bg-blue-100 text-blue-700 border-blue-200",
      P3: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return <Badge variant="outline" className={colors[priority]}>{priority}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "待执行",
      passed: "通过",
      failed: "失败",
    };
    return labels[status] || status;
  };

  const getCaseTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      functional: "功能测试",
      boundary: "边界测试",
      exception: "异常测试",
      performance: "性能测试",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">测试用例</h1>
          <p className="text-muted-foreground">管理和执行测试用例</p>
        </div>
        <Button onClick={handleExport} disabled={exportMutation.isPending}>
          {exportMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          导出Excel {selectedIds.length > 0 && `(${selectedIds.length})`}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索用例编号、场景、模块..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="模块" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模块</SelectItem>
                {modules?.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="P0">P0</SelectItem>
                <SelectItem value="P1">P1</SelectItem>
                <SelectItem value="P2">P2</SelectItem>
                <SelectItem value="P3">P3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待执行</SelectItem>
                <SelectItem value="passed">通过</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !testCases || testCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无测试用例</h3>
              <p className="text-muted-foreground">上传需求文档并生成测试用例</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedIds.length === testCases.length && testCases.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-[100px]">编号</TableHead>
                    <TableHead className="w-[100px]">模块</TableHead>
                    <TableHead>测试场景</TableHead>
                    <TableHead className="w-[80px]">优先级</TableHead>
                    <TableHead className="w-[100px]">类型</TableHead>
                    <TableHead className="w-[100px]">状态</TableHead>
                    <TableHead className="w-[80px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCases.map((tc) => (
                    <TableRow key={tc.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(tc.id)}
                          onCheckedChange={() => toggleSelect(tc.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{tc.caseNumber}</TableCell>
                      <TableCell>{tc.module || "-"}</TableCell>
                      <TableCell className="max-w-[300px] truncate" title={tc.scenario}>
                        {tc.scenario}
                      </TableCell>
                      <TableCell>{getPriorityBadge(tc.priority)}</TableCell>
                      <TableCell className="text-sm">{getCaseTypeLabel(tc.caseType)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(tc.executionStatus)}
                          <span className="text-sm">{getStatusLabel(tc.executionStatus)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(tc as TestCase)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCase(tc as TestCase);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑测试用例</DialogTitle>
            <DialogDescription>修改测试用例信息和执行状态</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>模块</Label>
                <Input
                  value={editForm.module}
                  onChange={(e) => setEditForm({ ...editForm, module: e.target.value })}
                  placeholder="所属模块"
                />
              </div>
              <div className="space-y-2">
                <Label>优先级</Label>
                <Select
                  value={editForm.priority}
                  onValueChange={(v) => setEditForm({ ...editForm, priority: v as any })}
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
            </div>
            <div className="space-y-2">
              <Label>测试场景</Label>
              <Input
                value={editForm.scenario}
                onChange={(e) => setEditForm({ ...editForm, scenario: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>前置条件</Label>
              <Textarea
                value={editForm.precondition}
                onChange={(e) => setEditForm({ ...editForm, precondition: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>测试步骤（每行一个步骤）</Label>
              <Textarea
                value={editForm.steps}
                onChange={(e) => setEditForm({ ...editForm, steps: e.target.value })}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>预期结果</Label>
              <Textarea
                value={editForm.expectedResult}
                onChange={(e) => setEditForm({ ...editForm, expectedResult: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>用例类型</Label>
                <Select
                  value={editForm.caseType}
                  onValueChange={(v) => setEditForm({ ...editForm, caseType: v as any })}
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
              <div className="space-y-2">
                <Label>执行状态</Label>
                <Select
                  value={editForm.executionStatus}
                  onValueChange={(v) => setEditForm({ ...editForm, executionStatus: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待执行</SelectItem>
                    <SelectItem value="passed">通过</SelectItem>
                    <SelectItem value="failed">失败</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editForm.executionStatus !== "pending" && (
              <div className="space-y-2">
                <Label>执行结果备注</Label>
                <Textarea
                  value={editForm.executionResult}
                  onChange={(e) => setEditForm({ ...editForm, executionResult: e.target.value })}
                  placeholder="记录执行结果或失败原因"
                  rows={2}
                />
              </div>
            )}
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
              确定要删除测试用例 "{selectedCase?.caseNumber}" 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCase && deleteMutation.mutate({ id: selectedCase.id })}
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
