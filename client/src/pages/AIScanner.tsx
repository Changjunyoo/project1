import { useState, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useIngredients, useCreateTransaction } from "@/hooks/use-inventory";
import {
  Camera,
  Upload,
  Loader2,
  Check,
  X,
  Sparkles,
  FileText,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  ShoppingCart,
  Pencil,
  Trash2,
  Plus,
  Send,
  Image as ImageIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ParsedItem {
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

interface AnalysisResult {
  items: ParsedItem[];
  summary: string;
  documentType: string;
  rawText: string;
}

export default function AIScanner() {
  const { data: ingredients } = useIngredients();
  const { toast } = useToast();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hint, setHint] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [editingItems, setEditingItems] = useState<ParsedItem[]>([]);
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "오류", description: "이미지 파일만 업로드 가능합니다.", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setEditingItems([]);

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      if (hint) formData.append("hint", hint);

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "분석 실패");
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
      setEditingItems(data.items.map((item) => ({ ...item })));

      toast({
        title: "분석 완료",
        description: `${data.items.length}개 품목이 감지되었습니다. (${data.documentType})`,
      });
    } catch (err) {
      toast({
        title: "분석 실패",
        description: err instanceof Error ? err.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = async () => {
    if (editingItems.length === 0) return;

    setApplying(true);
    try {
      const res = await fetch("/api/ai/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: editingItems }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "적용 실패");
      }

      const data = await res.json();
      const successCount = data.results.filter((r: any) => r.status === "success").length;
      const errorCount = data.results.filter((r: any) => r.status === "error").length;
      const skippedCount = data.results.filter((r: any) => r.status === "skipped").length;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

      toast({
        title: "적용 완료",
        description: `성공: ${successCount}건${errorCount > 0 ? `, 실패: ${errorCount}건` : ""}${skippedCount > 0 ? `, 건너뜀: ${skippedCount}건` : ""}`,
      });

      // Reset
      setResult(null);
      setEditingItems([]);
      setImagePreview(null);
      setSelectedFile(null);
      setHint("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast({
        title: "적용 실패",
        description: err instanceof Error ? err.message : "알 수 없는 오류",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const updateItem = (index: number, updates: Partial<ParsedItem>) => {
    setEditingItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const removeItem = (index: number) => {
    setEditingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIngredientMatch = (index: number, ingredientId: number) => {
    const ing = ingredients?.find((i) => i.id === ingredientId);
    if (ing) {
      updateItem(index, {
        matchedIngredientId: ing.id,
        matchedIngredientName: ing.name,
        isNew: false,
        unit: ing.unit,
      });
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "IN": return "입고";
      case "OUT": return "출고";
      case "PURCHASE": return "사입";
      default: return type;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "IN": return "text-green-600 bg-green-50 border-green-200";
      case "OUT": return "text-orange-600 bg-orange-50 border-orange-200";
      case "PURCHASE": return "text-blue-600 bg-blue-50 border-blue-200";
      default: return "";
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "IN": return <ArrowDownRight className="w-3.5 h-3.5" />;
      case "OUT": return <ArrowUpRight className="w-3.5 h-3.5" />;
      case "PURCHASE": return <ShoppingCart className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  return (
    <div className="flex bg-muted/20 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            AI 자동 입출고
          </h1>
          <p className="text-muted-foreground mt-1">
            사진을 올리면 AI가 자동으로 분석하여 재고를 입고/출고합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Upload area */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Camera className="w-5 h-5" />
                  이미지 업로드
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drop area */}
                <div
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="space-y-3">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded-lg shadow-md object-contain"
                      />
                      <p className="text-sm text-muted-foreground">
                        클릭하여 다른 이미지 선택
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          이미지를 클릭하여 업로드
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          영수증, 거래명세서, 송장, 재고 메모 등
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hint input */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    힌트 (선택사항)
                  </label>
                  <Input
                    placeholder="예: 가락시장에서 구매한 야채류 입고, 강남점 출고 목록..."
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                  />
                </div>

                {/* Analyze button */}
                <Button
                  onClick={handleAnalyze}
                  disabled={!selectedFile || analyzing}
                  className="w-full gap-2 bg-primary"
                  size="lg"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      AI 분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      AI 분석 시작
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Analysis info */}
            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5" />
                    분석 결과
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{result.documentType}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {result.items.length}개 품목 감지
                    </span>
                  </div>
                  <p className="text-sm">{result.summary}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRawText(!showRawText)}
                    className="text-xs"
                  >
                    {showRawText ? "원본 텍스트 숨기기" : "원본 텍스트 보기"}
                  </Button>
                  {showRawText && (
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">
                      {result.rawText}
                    </pre>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Parsed items */}
          <div className="space-y-4">
            {editingItems.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="w-5 h-5" />
                        감지된 품목 ({editingItems.length})
                      </CardTitle>
                      <Button
                        onClick={handleApply}
                        disabled={applying || editingItems.length === 0}
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        {applying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            적용 중...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            전체 적용
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {editingItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="border border-border rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow"
                      >
                        {/* Top row: name + type + delete */}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${typeColor(item.type)}`}>
                            {typeIcon(item.type)}
                            {typeLabel(item.type)}
                          </span>
                          <span className="font-bold flex-1">{item.name}</span>
                          {item.isNew && (
                            <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300 bg-yellow-50">
                              <Plus className="w-3 h-3 mr-0.5" />
                              신규
                            </Badge>
                          )}
                          {item.matchedIngredientName && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                              <Check className="w-3 h-3 mr-0.5" />
                              {item.matchedIngredientName}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeItem(idx)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Edit fields */}
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground">수량</label>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(idx, { quantity: parseInt(e.target.value) || 1 })
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">단위</label>
                            <Input
                              value={item.unit}
                              onChange={(e) => updateItem(idx, { unit: e.target.value })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">단가</label>
                            <Input
                              type="number"
                              min={0}
                              value={item.unitPrice ?? ""}
                              onChange={(e) =>
                                updateItem(idx, {
                                  unitPrice: e.target.value ? parseInt(e.target.value) : undefined,
                                })
                              }
                              className="h-8 text-sm"
                              placeholder="₩"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">유형</label>
                            <select
                              value={item.type}
                              onChange={(e) =>
                                updateItem(idx, { type: e.target.value as "IN" | "OUT" | "PURCHASE" })
                              }
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                            >
                              <option value="IN">입고</option>
                              <option value="OUT">출고</option>
                              <option value="PURCHASE">사입</option>
                            </select>
                          </div>
                        </div>

                        {/* Ingredient matching */}
                        {item.isNew && ingredients && ingredients.length > 0 && (
                          <div>
                            <label className="text-xs text-muted-foreground">
                              기존 식자재와 매칭 (선택)
                            </label>
                            <select
                              value={item.matchedIngredientId ?? ""}
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleIngredientMatch(idx, parseInt(e.target.value));
                                } else {
                                  updateItem(idx, {
                                    matchedIngredientId: undefined,
                                    matchedIngredientName: undefined,
                                    isNew: true,
                                  });
                                }
                              }}
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm mt-1"
                            >
                              <option value="">신규 식자재로 등록</option>
                              {ingredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>
                                  {ing.name} ({ing.unit}, 재고: {ing.currentStock})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Optional fields */}
                        <div className="grid grid-cols-2 gap-2">
                          {(item.type === "PURCHASE" || item.supplier) && (
                            <div>
                              <label className="text-xs text-muted-foreground">사입처</label>
                              <Input
                                value={item.supplier ?? ""}
                                onChange={(e) => updateItem(idx, { supplier: e.target.value })}
                                className="h-8 text-sm"
                                placeholder="공급처"
                              />
                            </div>
                          )}
                          {(item.type === "OUT" || item.destination) && (
                            <div>
                              <label className="text-xs text-muted-foreground">출고처</label>
                              <Input
                                value={item.destination ?? ""}
                                onChange={(e) => updateItem(idx, { destination: e.target.value })}
                                className="h-8 text-sm"
                                placeholder="지점"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Empty state */}
            {!result && !analyzing && (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    이미지를 업로드하고 AI 분석을 시작하세요
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    영수증, 거래명세서, 송장, 수기 메모 등을 인식합니다
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Loading state */}
            {analyzing && (
              <Card>
                <CardContent className="py-16 text-center">
                  <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-lg font-medium">AI가 이미지를 분석하고 있습니다...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    잠시만 기다려주세요 (보통 5~15초)
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
