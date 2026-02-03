import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, History as HistoryIcon, Loader2, Sparkles, Wand2, XCircle } from "lucide-react";

export default function History() {
  const { data: history, isLoading } = trpc.history.list.useQuery();

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">生成历史</h1>
        <p className="text-muted-foreground">查看测试用例生成记录</p>
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
                    <TableHead className="w-[180px]">生成时间</TableHead>
                    <TableHead className="w-[140px]">生成方式</TableHead>
                    <TableHead className="w-[100px]">用例数量</TableHead>
                    <TableHead className="w-[100px]">状态</TableHead>
                    <TableHead>错误信息</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        {new Date(item.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getModeIcon(item.mode)}
                          <span className="text-sm">{getModeLabel(item.mode)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{item.caseCount || 0}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {item.errorMessage || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
