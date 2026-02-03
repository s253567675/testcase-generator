import { invokeLLM } from "./_core/llm";
import { TemplateContent } from "../drizzle/schema";

export interface GeneratedTestCase {
  caseNumber: string;
  module: string;
  scenario: string;
  precondition: string;
  steps: string[];
  expectedResult: string;
  priority: "P0" | "P1" | "P2" | "P3";
  caseType: "functional" | "boundary" | "exception" | "performance";
}

/**
 * 基于模板生成测试用例
 */
export function generateTestCasesWithTemplate(
  content: string,
  documentName: string
): GeneratedTestCase[] {
  const testCases: GeneratedTestCase[] = [];
  const modules = detectModules(content);
  let caseIndex = 1;

  for (const moduleName of modules) {
    const templates = getTemplatesForModule(moduleName);
    for (const template of templates) {
      testCases.push({
        caseNumber: `TC-${String(caseIndex++).padStart(4, "0")}`,
        module: moduleName,
        scenario: template.scenario,
        precondition: template.precondition,
        steps: template.steps,
        expectedResult: template.expectedResult,
        priority: template.priority,
        caseType: template.caseType,
      });
    }
  }

  return testCases;
}

/**
 * 使用自定义模板生成测试用例
 */
export function generateTestCasesWithCustomTemplate(
  content: string,
  documentName: string,
  templateContent: TemplateContent[]
): GeneratedTestCase[] {
  const testCases: GeneratedTestCase[] = [];
  let caseIndex = 1;
  const modules = detectModules(content);
  const moduleName = modules.length > 0 ? modules[0] : "general";

  for (const template of templateContent) {
    testCases.push({
      caseNumber: `TC-${String(caseIndex++).padStart(4, "0")}`,
      module: moduleName,
      scenario: template.scenario,
      precondition: template.precondition,
      steps: template.steps,
      expectedResult: template.expectedResult,
      priority: template.priority,
      caseType: template.caseType,
    });
  }

  return testCases;
}

/**
 * 使用AI生成测试用例
 */
export async function generateTestCasesWithAI(
  content: string,
  documentName: string
): Promise<GeneratedTestCase[]> {
  const prompt = `你是一个专业的软件测试工程师。请根据以下需求文档内容，生成详细的测试用例。

需求文档名称: ${documentName}

需求文档内容:
${content.substring(0, 8000)}

请生成测试用例，要求：
1. 每个测试用例包含：用例编号、所属模块、测试场景、前置条件、测试步骤、预期结果、优先级、用例类型
2. 优先级分为：P0(最高)、P1(高)、P2(中)、P3(低)
3. 用例类型分为：functional(功能测试)、boundary(边界测试)、exception(异常测试)、performance(性能测试)
4. 测试步骤应该详细且可执行
5. 覆盖正常流程、边界条件和异常情况

请以JSON数组格式返回，每个测试用例的格式如下：
{
  "caseNumber": "TC-0001",
  "module": "模块名称",
  "scenario": "测试场景描述",
  "precondition": "前置条件",
  "steps": ["步骤1", "步骤2", "步骤3"],
  "expectedResult": "预期结果",
  "priority": "P0/P1/P2/P3",
  "caseType": "functional/boundary/exception/performance"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是一个专业的软件测试工程师，擅长编写高质量的测试用例。" },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "test_cases",
          strict: true,
          schema: {
            type: "object",
            properties: {
              testCases: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    caseNumber: { type: "string" },
                    module: { type: "string" },
                    scenario: { type: "string" },
                    precondition: { type: "string" },
                    steps: { type: "array", items: { type: "string" } },
                    expectedResult: { type: "string" },
                    priority: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
                    caseType: { type: "string", enum: ["functional", "boundary", "exception", "performance"] },
                  },
                  required: ["caseNumber", "module", "scenario", "precondition", "steps", "expectedResult", "priority", "caseType"],
                  additionalProperties: false,
                },
              },
            },
            required: ["testCases"],
            additionalProperties: false,
          },
        },
      },
    });

    const content_text = response.choices[0]?.message?.content;
    if (!content_text || typeof content_text !== 'string') {
      throw new Error("AI返回内容为空");
    }

    const parsed = JSON.parse(content_text);
    return parsed.testCases as GeneratedTestCase[];
  } catch (error) {
    console.error("[TestCaseGenerator] AI generation error:", error);
    throw new Error("AI生成测试用例失败");
  }
}

/**
 * 检测文档中涉及的功能模块
 */
function detectModules(content: string): string[] {
  const modules: string[] = [];
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes("登录") || lowerContent.includes("login") || lowerContent.includes("认证")) {
    modules.push("login");
  }
  if (lowerContent.includes("表单") || lowerContent.includes("form") || lowerContent.includes("提交")) {
    modules.push("form");
  }
  if (lowerContent.includes("搜索") || lowerContent.includes("search") || lowerContent.includes("查询")) {
    modules.push("search");
  }
  if (lowerContent.includes("列表") || lowerContent.includes("list") || lowerContent.includes("分页")) {
    modules.push("list");
  }
  if (lowerContent.includes("上传") || lowerContent.includes("upload") || lowerContent.includes("文件")) {
    modules.push("upload");
  }
  if (lowerContent.includes("导出") || lowerContent.includes("export") || lowerContent.includes("下载")) {
    modules.push("export");
  }
  if (lowerContent.includes("权限") || lowerContent.includes("permission") || lowerContent.includes("角色")) {
    modules.push("permission");
  }

  if (modules.length === 0) {
    modules.push("general");
  }

  return modules;
}

/**
 * 获取模块对应的测试用例模板
 */
function getTemplatesForModule(moduleName: string): GeneratedTestCase[] {
  const templates: Record<string, GeneratedTestCase[]> = {
    login: [
      {
        caseNumber: "",
        module: "登录",
        scenario: "正常登录",
        precondition: "用户已注册且账号状态正常",
        steps: ["打开登录页面", "输入正确的用户名", "输入正确的密码", "点击登录按钮"],
        expectedResult: "登录成功，跳转到首页",
        priority: "P0",
        caseType: "functional",
      },
      {
        caseNumber: "",
        module: "登录",
        scenario: "密码错误",
        precondition: "用户已注册",
        steps: ["打开登录页面", "输入正确的用户名", "输入错误的密码", "点击登录按钮"],
        expectedResult: "提示密码错误，登录失败",
        priority: "P1",
        caseType: "exception",
      },
      {
        caseNumber: "",
        module: "登录",
        scenario: "用户名为空",
        precondition: "无",
        steps: ["打开登录页面", "用户名输入框留空", "输入密码", "点击登录按钮"],
        expectedResult: "提示用户名不能为空",
        priority: "P1",
        caseType: "boundary",
      },
    ],
    form: [
      {
        caseNumber: "",
        module: "表单",
        scenario: "正常提交表单",
        precondition: "用户已登录",
        steps: ["打开表单页面", "填写所有必填字段", "点击提交按钮"],
        expectedResult: "表单提交成功，显示成功提示",
        priority: "P0",
        caseType: "functional",
      },
      {
        caseNumber: "",
        module: "表单",
        scenario: "必填字段为空",
        precondition: "用户已登录",
        steps: ["打开表单页面", "留空必填字段", "点击提交按钮"],
        expectedResult: "提示必填字段不能为空",
        priority: "P1",
        caseType: "boundary",
      },
      {
        caseNumber: "",
        module: "表单",
        scenario: "字段格式校验",
        precondition: "用户已登录",
        steps: ["打开表单页面", "在需要特定格式的字段输入非法格式", "点击提交按钮"],
        expectedResult: "提示格式错误",
        priority: "P2",
        caseType: "boundary",
      },
    ],
    search: [
      {
        caseNumber: "",
        module: "搜索",
        scenario: "关键词搜索",
        precondition: "系统中存在可搜索的数据",
        steps: ["打开搜索页面", "输入搜索关键词", "点击搜索按钮"],
        expectedResult: "显示包含关键词的搜索结果",
        priority: "P0",
        caseType: "functional",
      },
      {
        caseNumber: "",
        module: "搜索",
        scenario: "空关键词搜索",
        precondition: "无",
        steps: ["打开搜索页面", "不输入任何关键词", "点击搜索按钮"],
        expectedResult: "显示全部数据或提示请输入搜索关键词",
        priority: "P2",
        caseType: "boundary",
      },
      {
        caseNumber: "",
        module: "搜索",
        scenario: "无结果搜索",
        precondition: "无",
        steps: ["打开搜索页面", "输入不存在的关键词", "点击搜索按钮"],
        expectedResult: "显示无搜索结果的提示",
        priority: "P2",
        caseType: "functional",
      },
    ],
    list: [
      {
        caseNumber: "",
        module: "列表",
        scenario: "列表数据展示",
        precondition: "系统中存在数据",
        steps: ["打开列表页面"],
        expectedResult: "正确显示数据列表",
        priority: "P0",
        caseType: "functional",
      },
      {
        caseNumber: "",
        module: "列表",
        scenario: "分页功能",
        precondition: "数据量超过单页显示数量",
        steps: ["打开列表页面", "点击下一页"],
        expectedResult: "正确显示下一页数据",
        priority: "P1",
        caseType: "functional",
      },
    ],
    upload: [
      {
        caseNumber: "",
        module: "上传",
        scenario: "正常上传文件",
        precondition: "用户已登录",
        steps: ["点击上传按钮", "选择符合要求的文件", "确认上传"],
        expectedResult: "文件上传成功",
        priority: "P0",
        caseType: "functional",
      },
      {
        caseNumber: "",
        module: "上传",
        scenario: "上传超大文件",
        precondition: "用户已登录",
        steps: ["点击上传按钮", "选择超过大小限制的文件", "确认上传"],
        expectedResult: "提示文件过大，上传失败",
        priority: "P1",
        caseType: "boundary",
      },
    ],
    export: [
      {
        caseNumber: "",
        module: "导出",
        scenario: "导出数据",
        precondition: "系统中存在可导出的数据",
        steps: ["选择要导出的数据", "点击导出按钮"],
        expectedResult: "成功下载导出文件",
        priority: "P1",
        caseType: "functional",
      },
    ],
    permission: [
      {
        caseNumber: "",
        module: "权限",
        scenario: "无权限访问",
        precondition: "用户角色无对应权限",
        steps: ["登录无权限账号", "尝试访问受限功能"],
        expectedResult: "提示无权限访问",
        priority: "P1",
        caseType: "exception",
      },
    ],
    general: [
      {
        caseNumber: "",
        module: "通用",
        scenario: "页面加载",
        precondition: "无",
        steps: ["打开页面"],
        expectedResult: "页面正常加载，无报错",
        priority: "P0",
        caseType: "functional",
      },
    ],
  };

  return templates[moduleName] || templates.general;
}
