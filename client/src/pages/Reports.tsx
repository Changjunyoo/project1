import { useState, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useIngredients, useTransactions } from "@/hooks/use-inventory";
import { format } from "date-fns";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  ShoppingCart,
  Info,
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
import type { Transaction, IngredientWithNames } from "@shared/schema";

// Helper: format date to Korean style string
function fmtDate(d: Date): string {
  return format(d, "yyyy-MM-dd HH:mm");
}

function fmtDateShort(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

// Compute stock at a given point in time for one ingredient
// by replaying transactions from the current stock backwards
function computeStockAtTime(
  ingredient: IngredientWithNames,
  allTransactions: Transaction[],
  targetTime: Date
): number {
  // Current stock from DB
  let stock = ingredient.currentStock;

  // Get all transactions for this ingredient, sorted newest first
  const txs = allTransactions
    .filter((tx) => tx.ingredientId === ingredient.id)
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

  // Walk backwards from current time: for each transaction AFTER targetTime,
  // reverse its effect to get the stock at targetTime
  for (const tx of txs) {
    const txTime = new Date(tx.createdAt!);
    if (txTime <= targetTime) break; // reached target time

    // Reverse the transaction effect
    if (tx.type === "IN") {
      stock -= tx.quantity; // undo IN = subtract
    } else if (tx.type === "OUT") {
      stock += tx.quantity; // undo OUT = add back
    } else if (tx.type === "PURCHASE") {
      // Only reverse confirmed purchases (they affected stock)
      if (tx.confirmed === "CONFIRMED") {
        stock -= tx.quantity;
      }
    }
  }

  return Math.max(0, stock);
}

export default function Reports() {
  const { data: ingredients } = useIngredients();
  const { data: transactions } = useTransactions();

  // Date range state
  const today = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Parse dates
  const startTime = useMemo(
    () => new Date(startDate + "T00:00:00"),
    [startDate]
  );
  const endTime = useMemo(
    () => new Date(endDate + "T23:59:59"),
    [endDate]
  );

  // Filter transactions within range
  const rangeTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((tx) => {
      const t = new Date(tx.createdAt!);
      return t >= startTime && t <= endTime;
    });
  }, [transactions, startTime, endTime]);

  // Build report data per ingredient
  const reportData = useMemo(() => {
    if (!ingredients || !transactions) return [];

    return ingredients
      .map((ing) => {
        const stockAtStart = computeStockAtTime(ing, transactions, startTime);
        const stockAtEnd = computeStockAtTime(ing, transactions, endTime);

        const ingTxs = rangeTransactions
          .filter((tx) => tx.ingredientId === ing.id)
          .sort(
            (a, b) =>
              new Date(a.createdAt!).getTime() -
              new Date(b.createdAt!).getTime()
          );

        const totalIn = ingTxs
          .filter((tx) => tx.type === "IN")
          .reduce((s, tx) => s + tx.quantity, 0);
        const totalOut = ingTxs
          .filter((tx) => tx.type === "OUT")
          .reduce((s, tx) => s + tx.quantity, 0);
        const totalPurchaseConfirmed = ingTxs
          .filter(
            (tx) => tx.type === "PURCHASE" && tx.confirmed === "CONFIRMED"
          )
          .reduce((s, tx) => s + tx.quantity, 0);

        return {
          ingredient: ing,
          stockAtStart,
          stockAtEnd,
          totalIn,
          totalOut,
          totalPurchaseConfirmed,
          transactions: ingTxs,
        };
      })
      .filter(
        (r) =>
          r.transactions.length > 0 ||
          r.stockAtStart > 0 ||
          r.stockAtEnd > 0
      )
      .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name));
  }, [ingredients, transactions, rangeTransactions, startTime, endTime]);

  // Summary stats
  const totalItems = reportData.length;
  const totalTxCount = rangeTransactions.length;
  const totalInQty = reportData.reduce((s, r) => s + r.totalIn, 0);
  const totalOutQty = reportData.reduce((s, r) => s + r.totalOut, 0);

  // --- EXCEL EXPORT (SpreadsheetML XML — no external dependency) ---

  // Helper: escape XML special characters
  const escXml = (s: string | number): string => {
    const str = String(s);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  // Helper: build an XML worksheet from rows (array of objects)
  const buildSheet = (
    name: string,
    rows: Record<string, string | number>[]
  ): string => {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]);

    let xml = `<Worksheet ss:Name="${escXml(name)}"><Table>`;

    // Header row
    xml += "<Row>";
    for (const h of headers) {
      xml += `<Cell><Data ss:Type="String">${escXml(h)}</Data></Cell>`;
    }
    xml += "</Row>";

    // Data rows
    for (const row of rows) {
      xml += "<Row>";
      for (const h of headers) {
        const val = row[h];
        if (val === "" || val === undefined || val === null) {
          xml += `<Cell><Data ss:Type="String"></Data></Cell>`;
        } else if (typeof val === "number") {
          xml += `<Cell><Data ss:Type="Number">${val}</Data></Cell>`;
        } else {
          xml += `<Cell><Data ss:Type="String">${escXml(val)}</Data></Cell>`;
        }
      }
      xml += "</Row>";
    }

    xml += "</Table></Worksheet>";
    return xml;
  };

  const exportToExcel = () => {
    if (!ingredients || !transactions) return;

    // === Sheet 1: Summary (재고 요약) ===
    const summaryRows = reportData.map((r) => ({
      "품목명": r.ingredient.name,
      "브랜드": r.ingredient.brand || "",
      "단위": r.ingredient.unit,
      "기간 시작 재고": r.stockAtStart,
      "입고 합계": r.totalIn,
      "사입 확정 합계": r.totalPurchaseConfirmed,
      "출고 합계": r.totalOut,
      "기간 종료 재고": r.stockAtEnd,
      "현재 재고": r.ingredient.currentStock,
      "내역 건수": r.transactions.length,
    }));

    if (summaryRows.length === 0) {
      summaryRows.push({
        "품목명": "(해당 기간에 데이터 없음)",
        "브랜드": "",
        "단위": "",
        "기간 시작 재고": 0,
        "입고 합계": 0,
        "사입 확정 합계": 0,
        "출고 합계": 0,
        "기간 종료 재고": 0,
        "현재 재고": 0,
        "내역 건수": 0,
      });
    }

    // === Sheet 2: Detailed transactions (입출고 상세 내역) ===
    const detailRows: Record<string, string | number>[] = [];
    for (const r of reportData) {
      let runningStock = r.stockAtStart;

      for (const tx of r.transactions) {
        if (tx.type === "IN") {
          runningStock += tx.quantity;
        } else if (tx.type === "OUT") {
          runningStock -= tx.quantity;
        } else if (tx.type === "PURCHASE" && tx.confirmed === "CONFIRMED") {
          runningStock += tx.quantity;
        }

        const typeLabel =
          tx.type === "IN" ? "입고" : tx.type === "OUT" ? "출고" : "사입";

        detailRows.push({
          "품목명": r.ingredient.name,
          "날짜/시간": fmtDate(new Date(tx.createdAt!)),
          "유형": typeLabel,
          "수량": tx.type === "OUT" ? -tx.quantity : tx.quantity,
          "단위": r.ingredient.unit,
          "단가": tx.unitPrice ?? "",
          "출고처/지점": tx.destination || "",
          "사입처": tx.supplier || "",
          "부서": tx.department || "",
          "담당자": tx.personName || "",
          "상태":
            tx.type === "PURCHASE"
              ? tx.confirmed === "CONFIRMED"
                ? "확인됨"
                : tx.confirmed === "REJECTED"
                ? "거부됨"
                : "대기중"
              : "",
          "거래 후 재고": Math.max(0, runningStock),
        });
      }
    }

    if (detailRows.length === 0) {
      detailRows.push({
        "품목명": "(해당 기간에 내역 없음)",
        "날짜/시간": "",
        "유형": "",
        "수량": 0,
        "단위": "",
        "단가": "",
        "출고처/지점": "",
        "사입처": "",
        "부서": "",
        "담당자": "",
        "상태": "",
        "거래 후 재고": 0,
      });
    }

    // === Sheet 3: Per-ingredient detail (품목별 상세) ===
    const perIngRows: Record<string, string | number>[] = [];
    for (const r of reportData) {
      perIngRows.push({
        "품목": `[${r.ingredient.name}] (${r.ingredient.unit})`,
        "날짜/시간": "",
        "유형": "",
        "변동": "",
        "잔여 재고": "",
        "출고처": "",
        "담당자": "",
        "비고": `시작재고: ${r.stockAtStart} → 종료재고: ${r.stockAtEnd}`,
      });

      let running = r.stockAtStart;
      perIngRows.push({
        "품목": r.ingredient.name,
        "날짜/시간": fmtDateShort(startTime) + " (시작)",
        "유형": "기초재고",
        "변동": "",
        "잔여 재고": running,
        "출고처": "",
        "담당자": "",
        "비고": "",
      });

      for (const tx of r.transactions) {
        let change = 0;
        if (tx.type === "IN") {
          change = tx.quantity;
          running += tx.quantity;
        } else if (tx.type === "OUT") {
          change = -tx.quantity;
          running -= tx.quantity;
        } else if (tx.type === "PURCHASE" && tx.confirmed === "CONFIRMED") {
          change = tx.quantity;
          running += tx.quantity;
        }

        const typeLabel =
          tx.type === "IN" ? "입고" : tx.type === "OUT" ? "출고" : "사입";
        const details: string[] = [];
        if (tx.unitPrice)
          details.push(`단가:₩${tx.unitPrice.toLocaleString()}`);
        if (tx.supplier) details.push(`사입처:${tx.supplier}`);

        perIngRows.push({
          "품목": r.ingredient.name,
          "날짜/시간": fmtDate(new Date(tx.createdAt!)),
          "유형": typeLabel,
          "변동": change > 0 ? `+${change}` : `${change}`,
          "잔여 재고": Math.max(0, running),
          "출고처": tx.destination || "",
          "담당자": tx.department
            ? `${tx.department}/${tx.personName || ""}`
            : tx.personName || "",
          "비고": details.join(", "),
        });
      }

      perIngRows.push({
        "품목": r.ingredient.name,
        "날짜/시간": fmtDateShort(endTime) + " (종료)",
        "유형": "기말재고",
        "변동": "",
        "잔여 재고": r.stockAtEnd,
        "출고처": "",
        "담당자": "",
        "비고": "",
      });

      perIngRows.push({
        "품목": "",
        "날짜/시간": "",
        "유형": "",
        "변동": "",
        "잔여 재고": "",
        "출고처": "",
        "담당자": "",
        "비고": "",
      });
    }

    // Build SpreadsheetML XML
    let xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<?mso-application progid="Excel.Sheet"?>\n' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n' +
      ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
      '<Styles><Style ss:ID="Header"><Font ss:Bold="1"/></Style></Styles>\n';

    xml += buildSheet("재고 요약", summaryRows);
    xml += buildSheet("입출고 상세", detailRows);
    xml += buildSheet("품목별 상세", perIngRows);

    xml += "</Workbook>";

    // Trigger download as .xls (Excel opens SpreadsheetML XML as .xls)
    const blob = new Blob([xml], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `재고_리포트_${startDate}_${endDate}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex bg-muted/20 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
            리포트 / 엑셀 내보내기
          </h1>
          <p className="text-muted-foreground mt-1">
            기간을 지정하여 재고 현황과 입출고 내역을 엑셀로 내보낼 수 있습니다.
          </p>
        </div>

        {/* Date range picker + export button */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  <Calendar className="w-4 h-4 inline-block mr-1" />
                  시작 날짜
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="max-w-[200px]"
                  data-testid="input-report-start"
                />
              </div>
              <div className="text-muted-foreground font-bold text-lg hidden sm:block">~</div>
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  <Calendar className="w-4 h-4 inline-block mr-1" />
                  종료 날짜
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="max-w-[200px]"
                  data-testid="input-report-end"
                />
              </div>
              <Button
                onClick={exportToExcel}
                disabled={!ingredients || !transactions}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                data-testid="button-export-excel"
              >
                <Download className="w-4 h-4" />
                엑셀 다운로드
              </Button>
            </div>

            {/* Info box */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">엑셀 리포트에 포함되는 내용:</p>
                <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
                  <li><strong>재고 요약</strong> — 품목별 기간 시작/종료 재고, 입고/출고/사입 합계</li>
                  <li><strong>입출고 상세</strong> — 전체 거래 내역 (날짜, 수량, 단가, 출고처, 담당자 등)</li>
                  <li><strong>품목별 상세</strong> — 품목별 기초재고 → 거래내역 → 기말재고 (잔여 재고 추적)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">해당 품목수</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}개</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">거래 건수</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTxCount}건</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 입고 수량</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+{totalInQty}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 출고 수량</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">-{totalOutQty}</div>
            </CardContent>
          </Card>
        </div>

        {/* Preview table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-bold">
              미리보기: {fmtDateShort(startTime)} ~ {fmtDateShort(endTime)}
            </h2>
            <Badge variant="secondary">{totalTxCount}건</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">품목</th>
                  <th className="px-4 py-3 text-center">시작 재고</th>
                  <th className="px-4 py-3 text-center">입고</th>
                  <th className="px-4 py-3 text-center">출고</th>
                  <th className="px-4 py-3 text-center">사입(확정)</th>
                  <th className="px-4 py-3 text-center">종료 재고</th>
                  <th className="px-4 py-3 text-center">거래건수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      해당 기간에 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  reportData.map((r) => (
                    <tr key={r.ingredient.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.ingredient.name}</div>
                        {r.ingredient.brand && (
                          <div className="text-xs text-muted-foreground">{r.ingredient.brand}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {r.stockAtStart} <span className="text-muted-foreground text-xs">{r.ingredient.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.totalIn > 0 ? (
                          <span className="text-green-600 font-bold">+{r.totalIn}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.totalOut > 0 ? (
                          <span className="text-orange-600 font-bold">-{r.totalOut}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.totalPurchaseConfirmed > 0 ? (
                          <span className="text-blue-600 font-bold">+{r.totalPurchaseConfirmed}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold">
                        {r.stockAtEnd} <span className="text-muted-foreground text-xs font-normal">{r.ingredient.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">{r.transactions.length}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed transaction list for the period */}
        {reportData.length > 0 && (
          <div className="mt-8 bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold">기간 내 입출고 상세</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                각 품목별 기초재고에서 시작하여 거래 후 잔여 재고를 추적합니다.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                  <tr>
                    <th className="px-4 py-3">품목</th>
                    <th className="px-4 py-3">날짜/시간</th>
                    <th className="px-4 py-3">유형</th>
                    <th className="px-4 py-3 text-right">변동</th>
                    <th className="px-4 py-3 text-right">잔여 재고</th>
                    <th className="px-4 py-3">출고처</th>
                    <th className="px-4 py-3">부서/담당자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportData.map((r) => {
                    let running = r.stockAtStart;
                    return (
                      <>{/* Fragment key on ingredient */}
                        {/* Starting stock row */}
                        <tr key={`start-${r.ingredient.id}`} className="bg-muted/20">
                          <td className="px-4 py-2 font-bold">{r.ingredient.name}</td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">{fmtDateShort(startTime)} (시작)</td>
                          <td className="px-4 py-2">
                            <Badge variant="outline" className="text-xs">기초재고</Badge>
                          </td>
                          <td className="px-4 py-2 text-right">-</td>
                          <td className="px-4 py-2 text-right font-mono font-bold">
                            {running} {r.ingredient.unit}
                          </td>
                          <td className="px-4 py-2">-</td>
                          <td className="px-4 py-2">-</td>
                        </tr>
                        {/* Transaction rows */}
                        {r.transactions.map((tx) => {
                          let change = 0;
                          if (tx.type === "IN") {
                            change = tx.quantity;
                            running += tx.quantity;
                          } else if (tx.type === "OUT") {
                            change = -tx.quantity;
                            running -= tx.quantity;
                          } else if (tx.type === "PURCHASE" && tx.confirmed === "CONFIRMED") {
                            change = tx.quantity;
                            running += tx.quantity;
                          }

                          return (
                            <tr key={tx.id} className="hover:bg-muted/10">
                              <td className="px-4 py-2 text-muted-foreground">{r.ingredient.name}</td>
                              <td className="px-4 py-2 text-xs">{fmtDate(new Date(tx.createdAt!))}</td>
                              <td className="px-4 py-2">
                                {tx.type === "IN" ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                    <ArrowDownRight className="w-3 h-3" /> 입고
                                  </span>
                                ) : tx.type === "OUT" ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-orange-600">
                                    <ArrowUpRight className="w-3 h-3" /> 출고
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                                    <ShoppingCart className="w-3 h-3" /> 사입
                                  </span>
                                )}
                              </td>
                              <td className={`px-4 py-2 text-right font-bold ${change > 0 ? "text-green-600" : change < 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                                {change > 0 ? `+${change}` : change === 0 ? "-" : `${change}`}
                              </td>
                              <td className="px-4 py-2 text-right font-mono">
                                {Math.max(0, running)} {r.ingredient.unit}
                              </td>
                              <td className="px-4 py-2 text-xs text-muted-foreground">{tx.destination || "-"}</td>
                              <td className="px-4 py-2 text-xs text-muted-foreground">
                                {tx.department || tx.personName
                                  ? `${tx.department || ""}${tx.department && tx.personName ? "/" : ""}${tx.personName || ""}`
                                  : "-"}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Ending stock row */}
                        <tr key={`end-${r.ingredient.id}`} className="bg-muted/20 border-b-2 border-border">
                          <td className="px-4 py-2 font-bold">{r.ingredient.name}</td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">{fmtDateShort(endTime)} (종료)</td>
                          <td className="px-4 py-2">
                            <Badge variant="outline" className="text-xs">기말재고</Badge>
                          </td>
                          <td className="px-4 py-2 text-right">-</td>
                          <td className="px-4 py-2 text-right font-mono font-bold">
                            {r.stockAtEnd} {r.ingredient.unit}
                          </td>
                          <td className="px-4 py-2">-</td>
                          <td className="px-4 py-2">-</td>
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
