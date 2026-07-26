import type { ReactNode } from "react";

import { TransportError } from "../transport/contracts";

export function ErrorBanner({ error }: { error: TransportError }) {
  return (
    <section className="error-banner" role="alert">
      <strong>{error.message}</strong>
      <span>
        {error.code} · request {error.requestId ?? "없음"}
      </span>
    </section>
  );
}

export function ListPagination(props: {
  hasNext: boolean;
  hasPrev: boolean;
  isBusy: boolean;
  onNext: () => void;
  onPrev: () => void;
  page: number;
  total: number;
  totalPages: number;
}) {
  return (
    <div className="list-pagination">
      <p>
        page {props.page} / {props.totalPages} · total {props.total}
      </p>
      <div>
        <button
          type="button"
          disabled={props.isBusy || !props.hasPrev}
          onClick={props.onPrev}
        >
          이전
        </button>
        <button
          type="button"
          disabled={props.isBusy || !props.hasNext}
          onClick={props.onNext}
        >
          다음
        </button>
      </div>
    </div>
  );
}

export function SelectionPlaceholder(props: {
  children?: ReactNode;
  description: string;
}) {
  return (
    <div className="selection-placeholder">
      {props.children ?? props.description}
    </div>
  );
}
