import ExcelJS from "exceljs";

export interface ImportedTestCase {
  caseNumber?: string;
  module?: string;
  scenario: string;
  precondition?: string;
  steps: string[];
  expectedResult: string;
  priority: "P0" | "P1" | "P2" | "P3";
  caseType: "functional" | "boundary" | "exception" | "performance";
}

export interface ImportedTemplate {
  name: string;
  description?: string;
  moduleType?: string;
  cases: {
    scenario: string;
    precondition: string;
    steps: string[];
    expectedResult: string;
    priority: "P0" | "P1" | "P2" | "P3";
    caseType: "functional" | "boundary" | "exception" | "performance";
  }[];
}

const priorityMap: Record<string, "P0" | "P1" | "P2" | "P3"> = {
  P0: "P0",
  P1: "P1",
  P2: "P2",
  P3: "P3",
  最高: "P0",
  高: "P1",
  中: "P2",
  低: "P3",
};

const caseTypeMap: Record<string, "functional" | "boundary" | "exception" | "performance"> = {
  functional: "functional",
  boundary: "boundary",
  exception: "exception",
  performance: "performance",
  功能测试: "functional",
  边界测试: "boundary",
  异常测试: "exception",
  性能测试: "performance",
  功能: "functional",
  边界: "boundary",
  异常: "exception",
  性能: "performance",
};

function getCellValue(cell: ExcelJS.Cell): string {
  if (cell.value === null || cell.value === undefined) {
    return "";
  }
  if (typeof cell.value === "object" && "richText" in cell.value) {
    return (cell.value as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("");
  }
  if (typeof cell.value === "object" && "text" in cell.value) {
    return (cell.value as ExcelJS.CellHyperlinkValue).text;
  }
  return String(cell.value);
}

function parseSteps(stepsStr: string): string[] {
  if (!stepsStr) return [];
  // 尝试按换行分割
  let steps = stepsStr.split(/\r?\n/).filter((s) => s.trim());
  // 如果只有一行，尝试按数字序号分割
  if (steps.length === 1) {
    const numbered = stepsStr.split(/(?:\d+[\.\、\)]\s*)/);
    if (numbered.length > 1) {
      steps = numbered.filter((s) => s.trim());
    }
  }
  return steps.map((s) => s.trim()).filter(Boolean);
}

export async function importTestCasesFromExcel(buffer: Buffer | ArrayBuffer): Promise<ImportedTestCase[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Excel文件中没有工作表");
  }

  const testCases: ImportedTestCase[] = [];
  const headerRow = worksheet.getRow(1);
  
  // 查找列索引
  const columnMap: Record<string, number> = {};
  const headerNames = [
    { keys: ["用例编号", "编号", "caseNumber", "case_number", "id"], field: "caseNumber" },
    { keys: ["模块", "module", "功能模块"], field: "module" },
    { keys: ["测试场景", "场景", "scenario", "用例名称", "名称", "title"], field: "scenario" },
    { keys: ["前置条件", "precondition", "前提条件"], field: "precondition" },
    { keys: ["测试步骤", "步骤", "steps", "操作步骤"], field: "steps" },
    { keys: ["预期结果", "expectedResult", "expected_result", "期望结果"], field: "expectedResult" },
    { keys: ["优先级", "priority", "级别"], field: "priority" },
    { keys: ["用例类型", "类型", "caseType", "case_type", "测试类型"], field: "caseType" },
  ];

  headerRow.eachCell((cell, colNumber) => {
    const value = getCellValue(cell).trim().toLowerCase();
    for (const header of headerNames) {
      if (header.keys.some((k) => k.toLowerCase() === value)) {
        columnMap[header.field] = colNumber;
        break;
      }
    }
  });

  // 必须有场景和预期结果列
  if (!columnMap.scenario) {
    throw new Error("Excel文件缺少必要的列：测试场景");
  }
  if (!columnMap.expectedResult) {
    throw new Error("Excel文件缺少必要的列：预期结果");
  }

  // 读取数据行
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const scenario = columnMap.scenario ? getCellValue(row.getCell(columnMap.scenario)).trim() : "";
    const expectedResult = columnMap.expectedResult
      ? getCellValue(row.getCell(columnMap.expectedResult)).trim()
      : "";

    // 跳过空行
    if (!scenario && !expectedResult) continue;

    const priorityStr = columnMap.priority ? getCellValue(row.getCell(columnMap.priority)).trim() : "";
    const caseTypeStr = columnMap.caseType ? getCellValue(row.getCell(columnMap.caseType)).trim() : "";
    const stepsStr = columnMap.steps ? getCellValue(row.getCell(columnMap.steps)) : "";

    testCases.push({
      caseNumber: columnMap.caseNumber ? getCellValue(row.getCell(columnMap.caseNumber)).trim() : undefined,
      module: columnMap.module ? getCellValue(row.getCell(columnMap.module)).trim() : undefined,
      scenario: scenario || "未命名测试场景",
      precondition: columnMap.precondition ? getCellValue(row.getCell(columnMap.precondition)).trim() : undefined,
      steps: parseSteps(stepsStr),
      expectedResult: expectedResult || "无",
      priority: priorityMap[priorityStr] || "P2",
      caseType: caseTypeMap[caseTypeStr] || "functional",
    });
  }

  if (testCases.length === 0) {
    throw new Error("Excel文件中没有有效的测试用例数据");
  }

  return testCases;
}

export async function importTemplateFromExcel(buffer: Buffer | ArrayBuffer): Promise<ImportedTemplate> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  // 尝试读取模板信息工作表
  let templateName = "导入的模板";
  let templateDescription = "";
  let templateModuleType = "";

  const infoSheet = workbook.getWorksheet("模板信息") || workbook.getWorksheet("info");
  if (infoSheet) {
    const nameCell = infoSheet.getCell("B1");
    const descCell = infoSheet.getCell("B2");
    const moduleCell = infoSheet.getCell("B3");
    if (nameCell.value) templateName = getCellValue(nameCell).trim();
    if (descCell.value) templateDescription = getCellValue(descCell).trim();
    if (moduleCell.value) templateModuleType = getCellValue(moduleCell).trim();
  }

  // 读取测试用例工作表
  const casesSheet = workbook.getWorksheet("测试用例") || workbook.getWorksheet("cases") || workbook.worksheets[0];
  if (!casesSheet) {
    throw new Error("Excel文件中没有测试用例工作表");
  }

  const cases = await importTestCasesFromExcel(buffer);

  return {
    name: templateName,
    description: templateDescription || undefined,
    moduleType: templateModuleType || undefined,
    cases: cases.map((tc) => ({
      scenario: tc.scenario,
      precondition: tc.precondition || "",
      steps: tc.steps,
      expectedResult: tc.expectedResult,
      priority: tc.priority,
      caseType: tc.caseType,
    })),
  };
}
