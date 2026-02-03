import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, FileText, History, XCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats } = trpc.stats.executionStats.useQuery();
  const { data: documents } = trpc.document.list.useQuery();
  const { data: history } = trpc.history.list.useQuery();

  const recentHistory = history?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>
        <p className="text-muted-foreground">测试用例生成与管理概览</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/test-cases")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">测试用例总数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">点击查看全部用例</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待执行</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">等待执行的用例</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">通过</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.passed || 0}</div>
            <p className="text-xs text-muted-foreground">执行通过的用例</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">失败</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
            <p className="text-xs text-muted-foreground">执行失败的用例</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">快速操作</CardTitle>
            <CardDescription>常用功能入口</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <button
              onClick={() => setLocation("/documents")}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <div className="p-2 rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">上传需求文档</p>
                <p className="text-sm text-muted-foreground">支持Word、PDF、Markdown、纯文本</p>
              </div>
            </button>
            <button
              onClick={() => setLocation("/test-cases")}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <div className="p-2 rounded-md bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="font-medium">管理测试用例</p>
                <p className="text-sm text-muted-foreground">查看、编辑、执行测试用例</p>
              </div>
            </button>
            <button
              onClick={() => setLocation("/templates")}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <div className="p-2 rounded-md bg-blue-500/10">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">模板管理</p>
                <p className="text-sm text-muted-foreground">创建和管理测试用例模板</p>
              </div>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              最近生成记录
            </CardTitle>
            <CardDescription>最近的测试用例生成历史</CardDescription>
          </CardHeader>
          <CardContent>
            {recentHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">暂无生成记录</p>
            ) : (
              <div className="space-y-3">
                {recentHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.status === "completed"
                            ? "bg-green-500"
                            : item.status === "failed"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                        }`}
                      />
                      <span>{item.mode === "ai" ? "AI生成" : "模板生成"}</span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>{item.caseCount} 条用例</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recentHistory.length > 0 && (
              <button
                onClick={() => setLocation("/history")}
                className="w-full mt-4 text-sm text-primary hover:underline"
              >
                查看全部记录
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">需求文档</CardTitle>
          <CardDescription>已上传的需求文档列表</CardDescription>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">暂无上传的文档</p>
              <button
                onClick={() => setLocation("/documents")}
                className="mt-3 text-sm text-primary hover:underline"
              >
                上传第一个文档
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.slice(0, 5).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => setLocation("/documents")}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{doc.fileName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
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
                        ? "解析中"
                        : doc.status === "error"
                        ? "解析失败"
                        : "已上传"}
                    </span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {documents.length > 5 && (
                <button
                  onClick={() => setLocation("/documents")}
                  className="w-full mt-2 text-sm text-primary hover:underline"
                >
                  查看全部 {documents.length} 个文档
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
