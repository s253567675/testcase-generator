import { AIModel } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
}

/**
 * 使用自定义AI模型调用LLM
 */
export async function invokeCustomLLM(
  model: AIModel | null,
  messages: LLMMessage[]
): Promise<LLMResponse> {
  // 如果没有自定义模型，使用内置LLM
  if (!model) {
    const response = await invokeLLM({ messages });
    const content = response.choices[0]?.message?.content;
    return {
      content: typeof content === "string" ? content : "",
    };
  }

  // 根据不同的provider调用不同的API
  switch (model.provider.toLowerCase()) {
    case "deepseek":
      return invokeDeepSeek(model, messages);
    case "openai":
      return invokeOpenAI(model, messages);
    case "anthropic":
      return invokeAnthropic(model, messages);
    case "custom":
    default:
      return invokeGenericOpenAI(model, messages);
  }
}

/**
 * 调用DeepSeek API
 */
async function invokeDeepSeek(model: AIModel, messages: LLMMessage[]): Promise<LLMResponse> {
  const response = await fetch(model.apiUrl || "https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.modelId || "deepseek-chat",
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
  };
}

/**
 * 调用OpenAI API
 */
async function invokeOpenAI(model: AIModel, messages: LLMMessage[]): Promise<LLMResponse> {
  const response = await fetch(model.apiUrl || "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.modelId || "gpt-4",
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
  };
}

/**
 * 调用Anthropic API
 */
async function invokeAnthropic(model: AIModel, messages: LLMMessage[]): Promise<LLMResponse> {
  // 转换消息格式为Anthropic格式
  const systemMessage = messages.find((m) => m.role === "system")?.content || "";
  const userMessages = messages.filter((m) => m.role !== "system");

  const response = await fetch(model.apiUrl || "https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": model.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model.modelId || "claude-3-sonnet-20240229",
      max_tokens: 4096,
      system: systemMessage,
      messages: userMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text || "",
  };
}

/**
 * 调用通用OpenAI兼容API
 */
async function invokeGenericOpenAI(model: AIModel, messages: LLMMessage[]): Promise<LLMResponse> {
  const response = await fetch(model.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.modelId,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
  };
}

/**
 * 使用自定义模型生成测试用例
 */
export async function generateTestCasesWithCustomModel(
  model: AIModel | null,
  content: string,
  documentName: string
): Promise<any[]> {
  const systemPrompt = "你是一个专业的软件测试工程师，擅长编写高质量的测试用例。请以JSON数组格式返回测试用例。";
  
  const userPrompt = `请根据以下需求文档内容，生成详细的测试用例。

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
}

只返回JSON数组，不要包含其他内容。`;

  try {
    const response = await invokeCustomLLM(model, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    // 解析JSON响应
    let jsonContent = response.content.trim();
    
    // 尝试提取JSON数组
    const jsonMatch = jsonContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    const testCases = JSON.parse(jsonContent);
    
    if (!Array.isArray(testCases)) {
      throw new Error("返回的不是有效的测试用例数组");
    }

    return testCases;
  } catch (error) {
    console.error("[CustomLLM] Generation error:", error);
    throw new Error(`AI生成测试用例失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}
