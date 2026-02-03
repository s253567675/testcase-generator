import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import axios from "axios";

/**
 * 文档解析服务
 * 支持 Word (.docx), PDF (.pdf), Markdown (.md), 纯文本 (.txt)
 */

export async function parseDocument(fileUrl: string, fileType: string): Promise<string> {
  try {
    // 下载文件内容
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
    });
    const buffer = Buffer.from(response.data);

    switch (fileType.toLowerCase()) {
      case "docx":
      case "doc":
        return await parseWord(buffer);
      case "pdf":
        return await parsePdf(buffer);
      case "md":
      case "markdown":
        return parseMarkdown(buffer);
      case "txt":
      case "text":
        return parseText(buffer);
      default:
        throw new Error(`不支持的文件类型: ${fileType}`);
    }
  } catch (error) {
    console.error("[DocumentParser] Error parsing document:", error);
    throw error;
  }
}

/**
 * 解析 Word 文档 (.docx)
 * 使用 mammoth 库
 */
async function parseWord(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  } catch (error) {
    console.error("[DocumentParser] Error parsing Word document:", error);
    throw new Error("Word文档解析失败");
  }
}

/**
 * 解析 PDF 文档
 * 使用 pdf-parse 库
 */
async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text.trim();
  } catch (error) {
    console.error("[DocumentParser] Error parsing PDF document:", error);
    throw new Error("PDF文档解析失败");
  }
}

/**
 * 解析 Markdown 文档
 * 直接返回文本内容
 */
function parseMarkdown(buffer: Buffer): string {
  return buffer.toString("utf-8").trim();
}

/**
 * 解析纯文本文档
 */
function parseText(buffer: Buffer): string {
  return buffer.toString("utf-8").trim();
}

/**
 * 从 Base64 数据解析文档
 */
export async function parseDocumentFromBase64(base64Data: string, fileType: string): Promise<string> {
  const buffer = Buffer.from(base64Data, "base64");

  switch (fileType.toLowerCase()) {
    case "docx":
    case "doc":
      return await parseWord(buffer);
    case "pdf":
      return await parsePdf(buffer);
    case "md":
    case "markdown":
      return parseMarkdown(buffer);
    case "txt":
    case "text":
      return parseText(buffer);
    default:
      throw new Error(`不支持的文件类型: ${fileType}`);
  }
}
