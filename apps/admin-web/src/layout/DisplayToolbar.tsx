export function DisplayToolbar(props: {
  compact: boolean;
  onCompactChange: (compact: boolean) => void;
}) {
  return (
    <div className="display-toolbar" aria-label="화면 표시 설정">
      <span>표시 밀도</span>
      <button
        type="button"
        aria-pressed={!props.compact}
        onClick={() => props.onCompactChange(false)}
      >
        기본
      </button>
      <button
        type="button"
        aria-pressed={props.compact}
        onClick={() => props.onCompactChange(true)}
      >
        압축
      </button>
    </div>
  );
}
