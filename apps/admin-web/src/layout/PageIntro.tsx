import type { ReactNode } from "react";

export interface PageMetric {
  hint?: string;
  label: string;
  value: string;
}

export function PageIntro(props: {
  actions?: ReactNode;
  description: string;
  kicker: string;
  metrics?: PageMetric[];
  title: string;
}) {
  return (
    <section className="page-intro">
      <div>
        <span className="eyebrow">{props.kicker}</span>
        <h2>{props.title}</h2>
        <p>{props.description}</p>
      </div>
      {props.actions}
      {props.metrics?.length ? (
        <div className="page-intro-metrics">
          {props.metrics.map((metric) => (
            <article key={`${metric.label}-${metric.value}`}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              {metric.hint ? <small>{metric.hint}</small> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
