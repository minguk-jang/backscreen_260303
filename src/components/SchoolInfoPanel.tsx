import type { SchoolInfo } from "../types";

interface SchoolInfoPanelProps {
  schoolInfo: SchoolInfo;
  onChangeField: (field: "schoolName" | "className", value: string) => void;
}

export function SchoolInfoPanel({ schoolInfo, onChangeField }: SchoolInfoPanelProps) {
  return (
    <section className="panel">
      <h2>학교 정보</h2>
      <div className="field-grid two-col">
        <label>
          학교명
          <input
            value={schoolInfo.schoolName}
            onChange={(event) => onChangeField("schoolName", event.target.value)}
            placeholder="예: 새봄초등학교"
          />
        </label>
        <label>
          학급명
          <input
            value={schoolInfo.className}
            onChange={(event) => onChangeField("className", event.target.value)}
            placeholder="예: 5학년 1반"
          />
        </label>
      </div>
    </section>
  );
}
