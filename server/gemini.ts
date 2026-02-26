import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from "./storage";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("[gemini] GEMINI_API_KEY is not set. AI features will be disabled.");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  type: "IN" | "OUT" | "PURCHASE";
  supplier?: string;
  destination?: string;
  department?: string;
  personName?: string;
  matchedIngredientId?: number;
  matchedIngredientName?: string;
  isNew?: boolean;
}

export interface AnalysisResult {
  items: ParsedItem[];
  summary: string;
  documentType: string;
  rawText: string;
}

export async function analyzeImage(
  imageBuffer: Buffer,
  mimeType: string,
  userHint?: string
): Promise<AnalysisResult> {
  if (!genAI) {
    throw new Error("Gemini API key is not configured. Add GEMINI_API_KEY to your .env file.");
  }

  // Get existing ingredients for matching
  const existingIngredients = await storage.getIngredients();
  const ingredientList = existingIngredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    brand: i.brand || "",
  }));

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `당신은 식자재 재고관리 시스템의 AI 어시스턴트입니다.
업로드된 이미지(영수증, 명세서, 송장, 재고 목록, 메모 등)를 분석하여 식자재 입출고 데이터를 추출해주세요.

## 기존 등록된 식자재 목록:
${JSON.stringify(ingredientList, null, 2)}

## 사용자 힌트:
${userHint || "없음"}

## 분석 규칙:
1. 이미지에서 식자재명, 수량, 단위, 단가 등을 정확히 추출
2. 기존 식자재와 이름이 비슷하면 매칭 (id를 matchedIngredientId에 포함)
3. 기존에 없는 식자재는 isNew: true로 표시
4. 문서 유형을 파악 (거래명세서, 영수증, 수기메모, 재고목록 등)
5. 입고/출고/사입 여부를 문맥에서 판단:
   - 거래명세서/송장/구매영수증 → "IN" (입고) 또는 "PURCHASE" (사입)
   - 출고전표/배송목록 → "OUT" (출고)
   - 판단 불가 시 → "IN"으로 기본 설정

## 응답 형식 (JSON만 반환, 다른 텍스트 없이):
{
  "items": [
    {
      "name": "품목명",
      "quantity": 수량(숫자),
      "unit": "단위(kg, 개, 박스 등)",
      "unitPrice": 단가(숫자, 없으면 null),
      "type": "IN 또는 OUT 또는 PURCHASE",
      "supplier": "공급처명(있으면)",
      "destination": "출고처(있으면)",
      "matchedIngredientId": 매칭된_식자재_ID_또는_null,
      "matchedIngredientName": "매칭된_식자재명_또는_null",
      "isNew": true_또는_false
    }
  ],
  "summary": "분석 요약 (한국어, 예: 가락시장에서 야채류 5종 입고)",
  "documentType": "문서 유형 (거래명세서, 영수증, 수기메모, 재고목록 등)",
  "rawText": "이미지에서 읽은 원본 텍스트 전체"
}`;

  const imageBase64 = imageBuffer.toString("base64");

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);

  const responseText = result.response.text();

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = responseText;
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr) as AnalysisResult;

    // Validate and clean up items
    parsed.items = parsed.items.map((item) => ({
      name: item.name || "알 수 없음",
      quantity: Number(item.quantity) || 1,
      unit: item.unit || "개",
      unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
      type: (["IN", "OUT", "PURCHASE"].includes(item.type) ? item.type : "IN") as "IN" | "OUT" | "PURCHASE",
      supplier: item.supplier || undefined,
      destination: item.destination || undefined,
      department: item.department || undefined,
      personName: item.personName || undefined,
      matchedIngredientId: item.matchedIngredientId || undefined,
      matchedIngredientName: item.matchedIngredientName || undefined,
      isNew: item.isNew ?? !item.matchedIngredientId,
    }));

    return parsed;
  } catch {
    // If JSON parse fails, return a basic result
    return {
      items: [],
      summary: "이미지 분석에 실패했습니다. 다시 시도해주세요.",
      documentType: "알 수 없음",
      rawText: responseText,
    };
  }
}
