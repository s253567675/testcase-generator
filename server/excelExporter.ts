import ExcelJS from "exceljs";
import { TestCase } from "../drizzle/schema";

/**
 * 导出测试用例到Excel
 */
export async function exportTestCasesToExcel(testCases: TestCase[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "测试用例生成器";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("测试用例", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  });

  // 设置列
  worksheet.columns = [
    { header: "用例编号", key: "caseNumber", width: 15 },
    { header: "所属模块", key: "module", width: 15 },
    { header: "测试场景", key: "scenario", width: 30 },
    { header: "前置条件", key: "precondition", width: 25 },
    { header: "测试步骤", key: "steps", width: 40 },
    { header: "预期结果", key: "expectedResult", width: 30 },
    { header: "优先级", key: "priority", width: 10 },
    { header: "用例类型", key: "caseType", width: 12 },
    { header: "执行状态", key: "executionStatus", width: 12 },
    { header: "执行结果", key: "executionResult", width: 25 },
    { header: "生成方式", key: "generationMode", width: 12 },
    { header: "创建时间", key: "createdAt", width: 18 },
  ];

  // 设置表头样式
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 25;

  // 添加数据
  for (const testCase of testCases) {
    const row = worksheet.addRow({
      caseNumber: testCase.caseNumber,
      module: testCase.module || "",
      scenario: testCase.scenario,
      precondition: testCase.precondition || "",
      steps: Array.isArray(testCase.steps) ? testCase.steps.join("\n") : "",
      expectedResult: testCase.expectedResult,
      priority: testCase.priority,
      caseType: getCaseTypeLabel(testCase.caseType),
      executionStatus: getExecutionStatusLabel(testCase.executionStatus),
      executionResult: testCase.executionResult || "",
      generationMode: getGenerationModeLabel(testCase.generationMode),
      createdAt: testCase.createdAt ? formatDate(testCase.createdAt) : "",
    });

    // 设置行样式
    row.alignment = { vertical: "top", wrapText: true };

    // 根据执行状态设置背景色
    if (testCase.executionStatus === "passed") {
      row.getCell("executionStatus").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC6EFCE" },
      };
    } else if (testCase.executionStatus === "failed") {
      row.getCell("executionStatus").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFC7CE" },
      };
    }

    // 根据优先级设置颜色
    const priorityCell = row.getCell("priority");
    switch (testCase.priority) {
      case "P0":
        priorityCell.font = { color: { argb: "FFFF0000" }, bold: true };
        break;
      case "P1":
        priorityCell.font = { color: { argb: "FFFF6600" } };
        break;
      case "P2":
        priorityCell.font = { color: { argb: "FF0066FF" } };
        break;
      case "P3":
        priorityCell.font = { color: { argb: "FF666666" } };
        break;
    }
  }

  // 设置边框
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // 生成Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function getCaseTypeLabel(caseType: string): string {
  const labels: Record<string, string> = {
    functional: "功能测试",
    boundary: "边界测试",
    exception: "异常测试",
    performance: "性能测试",
  };
  return labels[caseType] || caseType;
}

function getExecutionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "待执行",
    passed: "通过",
    failed: "失败",
  };
  return labels[status] || status;
}

function getGenerationModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    ai: "AI生成",
    template: "模板生成",
    import: "导入",
  };
  return labels[mode] || mode;
}

function formatDate(date: Date): string {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
