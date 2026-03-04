import { useState } from "react";
import type { MealEntry } from "../types";
import { parseMealDocumentText } from "../utils/mealImportParser";

type SourceType = "hwp" | "hwpx" | "pdf";

interface MealImportPanelProps {
  monthKey: string;
  onApplyMeals: (entries: MealEntry[], meta: { fileName: string; sourceType: SourceType }) => void;
}

function sourceTypeFromFileName(fileName: string): SourceType | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "hwp" || ext === "hwpx" || ext === "pdf") {
    return ext;
  }
  return null;
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }

  if (typeof file.arrayBuffer === "function") {
    const buffer = await file.arrayBuffer();
    return new TextDecoder("utf-8").decode(buffer);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일 텍스트 읽기에 실패했습니다."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(file);
  });
}

export function MealImportPanel({ monthKey, onApplyMeals }: MealImportPanelProps) {
  const [parsed, setParsed] = useState<MealEntry[]>([]);
  const [fileName, setFileName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [error, setError] = useState("");

  const onSelectFile = async (file: File | undefined): Promise<void> => {
    if (!file) {
      return;
    }

    const nextType = sourceTypeFromFileName(file.name);
    if (!nextType) {
      setParsed([]);
      setFileName(file.name);
      setSourceType(null);
      setError("지원 파일 형식은 hwp/hwpx/pdf 입니다.");
      return;
    }

    try {
      const text = await readFileText(file);
      const next = parseMealDocumentText(text, monthKey);
      setFileName(file.name);
      setSourceType(nextType);
      setParsed(next);

      if (next.length === 0) {
        setError("문서 형식에서 급식 날짜/메뉴를 찾지 못했습니다.");
      } else {
        setError("");
      }
    } catch (readError) {
      setParsed([]);
      setFileName(file.name);
      setSourceType(nextType);
      setError(`파일 읽기 실패: ${String(readError)}`);
    }
  };

  return (
    <section className="panel meal-import-panel">
      <div className="panel-title-row">
        <h2>급식 업로드</h2>
      </div>
      <p className="helper-text">한글(hwp/hwpx) 또는 PDF 파일을 업로드해 이번 달 급식으로 반영합니다.</p>

      <label className="file-input-label btn-plain">
        파일 선택
        <input
          type="file"
          accept=".hwp,.hwpx,.pdf"
          onChange={(event) => void onSelectFile(event.target.files?.[0])}
        />
      </label>

      {fileName && <p className="helper-text">{`선택 파일: ${fileName}`}</p>}
      {error && <p className="helper-text import-error">{error}</p>}

      <div className="list-body compact">
        {parsed.slice(0, 8).map((entry) => (
          <div key={entry.id} className="entity-card">
            <strong>{entry.date}</strong>
            <p>{entry.items.join(", ")}</p>
          </div>
        ))}
        {!error && parsed.length === 0 && <p className="empty">파싱된 급식 데이터가 없습니다.</p>}
      </div>

      <button
        onClick={() => {
          if (!sourceType || parsed.length === 0) {
            return;
          }
          onApplyMeals(parsed, { fileName, sourceType });
        }}
      >
        파싱 결과 반영
      </button>
    </section>
  );
}
