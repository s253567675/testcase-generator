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
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Bot, CheckCircle2, Clock, History as HistoryIcon, Loader2, Sparkles, Trash2, User, Wand2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function History() {
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: history, isLoading } = trpc.history.list.useQuery();

  const deleteMutation = trpc.history.delete.useMutation({
    onSuccess: () => {
      toast.success("历史记录已删除");
      utils.history.list.invalidate();
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "删除失败");
    },
  });

  const batchDeleteMutation = trpc.history.batchDelete.useMutation({
    onSuccess: (result) => {
      toast.success(`成功删除 ${result.count} 条历史记录`);
      utils.history.list.invalidate();
      setBatchDeleteDialogOpen(false);
      setSelectedIds([]);
    },
    onError: (error) => {
      toast.error(error.message || "批量删除失败");
    },
  });

  const isAdmin = user?.role === "admin";

  const openDeleteDialog = (id: number) => {
    setSelectedId(id);
    setDeleteDialogOpen(true);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!history) return;
    if (selectedIds.length === history.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(history.map((item) => item.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            成功
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            失败
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            进行中
          </Badge>
        );
    }
  };

  const getModeIcon = (mode: string) => {
    if (mode === "ai") {
      return <Sparkles className="h-4 w-4 text-purple-500" />;
    }
    return <Wand2 className="h-4 w-4 text-blue-500" />;
  };

  const getModeLabel = (mode: string) => {
    return mode === "ai" ? "AI智能生成" : "模板生成";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">生成历史</h1>
          <p className="text-muted-foreground">
            查看测试用例生成记录
            {isAdmin && <span className="ml-2 text-xs">(管理员可删除记录)</span>}
          </p>
        </div>
        {isAdmin && selectedIds.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => setBatchDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            批量删除 ({selectedIds.length})
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !history || history.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HistoryIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无生成记录</h3>
            <p className="text-muted-foreground">上传文档并生成测试用例后，记录将显示在这里</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedIds.length === history.length && history.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead className="w-[180px]">生成时间</TableHead>
                    <TableHead className="w-[120px]">生成人</TableHead>
                    <TableHead className="w-[140px]">生成方式</TableHead>
                    <TableHead className="w-[120px]">使用模型</TableHead>
                    <TableHead className="w-[100px]">用例数量</TableHead>
                    <TableHead className="w-[100px]">状态</TableHead>
                    <TableHead>错误信息</TableHead>
                    {isAdmin && <TableHead className="w-[80px]">操作</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item: any) => (
                    <TableRow key={item.id}>
                      {isAdmin && (
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-sm">
                        {new Date(item.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.generatorName || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getModeIcon(item.mode)}
                          <span className="text-sm">{getModeLabel(item.mode)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.modelName || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{item.caseCount || 0}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {item.errorMessage || "-"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条生成历史记录吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedId && deleteMutation.mutate({ id: selectedId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认对话框 */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.length} 条生成历史记录吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => batchDeleteMutation.mutate({ ids: selectedIds })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {batchDeleteMutation.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
