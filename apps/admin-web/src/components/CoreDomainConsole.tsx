import { type FormEvent, useEffect, useMemo, useState } from "react";

import {
  executeCoreOperation,
  getCoreRegistry,
  type CoreExecuteResponse,
} from "../api/fleet";
import {
  type CoreOperation,
  coreRegistry,
} from "../generated/coreOperations";

export function CoreDomainConsole(props: {
  siteId: string;
  csrfToken: string;
}) {
  const domains = useMemo(
    () => [...new Set(coreRegistry.operations.map((item) => item.domain))],
    [],
  );
  const [domain, setDomain] = useState(domains[0] ?? "");
  const operations = useMemo(
    () => coreRegistry.operations.filter((item) => item.domain === domain),
    [domain],
  );
  const [operationId, setOperationId] = useState(
    operations[0]?.operation_id ?? "",
  );
  const operation = coreRegistry.operations.find(
    (item) => item.operation_id === operationId,
  ) ?? operations[0];
  const schemaDomain = coreRegistry.schema_domains.find(
    (item) => item.domain === domain,
  );
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState(
    defaultBody(operations[0]),
  );
  const [confirmDestructive, setConfirmDestructive] = useState(false);
  const [registryState, setRegistryState] = useState("서버 registry 확인 중");
  const [result, setResult] = useState<CoreExecuteResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getCoreRegistry()
      .then((serverOperations) => {
        const localIds = coreRegistry.operations
          .map((item) => item.operation_id)
          .sort();
        const serverIds = serverOperations
          .map((item) => item.operation_id)
          .sort();
        setRegistryState(
          JSON.stringify(localIds) === JSON.stringify(serverIds)
            ? `서버 registry ${serverIds.length}/189 일치`
            : "서버 registry 불일치",
        );
      })
      .catch(() => setRegistryState("로그인 뒤 registry를 확인할 수 있습니다."));
  }, []);

  if (!operation) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const body = operation.request_fields.length > 0
        ? parseObject(bodyText)
        : null;
      const path: Record<string, string> = {};
      const query: Record<string, unknown> = {};
      for (const parameter of operation.parameters) {
        const value = parameters[`${parameter.location}:${parameter.name}`] ??
          "";
        if (value || parameter.required) {
          if (parameter.location === "path") path[parameter.name] = value;
          else query[parameter.name] = value;
        }
      }
      setResult(
        await executeCoreOperation(
          props.siteId,
          operation.operation_id,
          {
            path,
            query,
            body,
            confirm_destructive: confirmDestructive,
          },
          props.csrfToken,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Core 요청 실패");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || operation.transport === "specialized" ||
    operation.risk === "external_effect";

  return (
    <section className="core-console" aria-labelledby="core-console-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Core / canonical 189</span>
          <h3 id="core-console-title">관리자 Core 작업</h3>
          <p>
            OpenAPI에서 생성한 동일 registry로 Rust route와 웹 소비를 선택합니다.
          </p>
        </div>
        <span className="registry-state">{registryState}</span>
      </div>

      <div className="core-metrics">
        <span><strong>{coreRegistry.counts.active}</strong> active</span>
        <span><strong>{coreRegistry.counts.schema_domains}</strong> schema domains</span>
        <span><strong>{coreRegistry.counts.shop}</strong> Shop Core</span>
      </div>

      <form className="core-form" onSubmit={(event) => void submit(event)}>
        <label>
          <span>도메인</span>
          <select
            value={domain}
            onChange={(event) => {
              const nextDomain = event.target.value;
              setDomain(nextDomain);
              setOperationId(
                coreRegistry.operations.find((item) =>
                  item.domain === nextDomain
                )?.operation_id ?? "",
              );
              setBodyText(
                defaultBody(
                  coreRegistry.operations.find((item) =>
                    item.domain === nextDomain
                  ),
                ),
              );
            }}
          >
            {domains.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          <span>operationId</span>
          <select
            value={operation.operation_id}
            onChange={(event) => {
              setOperationId(event.target.value);
              setParameters({});
              setBodyText(
                defaultBody(
                  coreRegistry.operations.find((item) =>
                    item.operation_id === event.target.value
                  ),
                ),
              );
              setConfirmDestructive(false);
              setResult(null);
            }}
          >
            {operations.map((item) => (
              <option key={item.operation_id} value={item.operation_id}>
                {item.method} · {item.operation_id}
              </option>
            ))}
          </select>
        </label>

        <div className="operation-contract">
          <code>{operation.method} {operation.path}</code>
          <span data-risk={operation.risk}>{riskLabel(operation)}</span>
          <small>
            request {operation.request_fields.length} fields · response{" "}
            {operation.response_fields.length} fields
          </small>
        </div>

        {operation.parameters.map((parameter) => (
          <label key={`${parameter.location}:${parameter.name}`}>
            <span>
              {parameter.location} · {parameter.name}
              {parameter.required ? " *" : ""}
            </span>
            <input
              required={parameter.required}
              value={parameters[`${parameter.location}:${parameter.name}`] ?? ""}
              onChange={(event) =>
                setParameters((current) => ({
                  ...current,
                  [`${parameter.location}:${parameter.name}`]: event.target.value,
                }))}
            />
          </label>
        ))}

        {operation.request_fields.length > 0 && (
          <label className="core-body">
            <span>요청 body · JSON object</span>
            <textarea
              spellCheck={false}
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
            />
            <small>
              허용 필드: {operation.request_fields.slice(0, 24).join(", ")}
              {operation.request_fields.length > 24 ? " …" : ""}
              {operation.request_required_fields.length > 0
                ? ` · 필수: ${operation.request_required_fields.join(", ")}`
                : ""}
            </small>
          </label>
        )}

        {operation.risk === "destructive" && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={confirmDestructive}
              onChange={(event) => setConfirmDestructive(event.target.checked)}
            />
            <span>삭제 대상을 확인했으며 명시적으로 실행합니다.</span>
          </label>
        )}

        {operation.risk === "external_effect" && (
          <p className="policy-block">
            외부 발송 작업은 routine Core에서 차단됩니다. B08 fake delivery 경계를
            사용합니다.
          </p>
        )}
        {operation.transport === "specialized" && (
          <p className="policy-block">
            이 연산은 비밀번호·토큰 경계를 지키는 전용 Fleet 화면에서만 실행합니다.
          </p>
        )}

        <button className="primary-action" type="submit" disabled={disabled}>
          {busy ? "실행 중" : "site-bound 실행"}
        </button>
      </form>

      {schemaDomain && (
        <details className="schema-parity">
          <summary>
            {schemaDomain.domain} field parity · {schemaDomain.field_count} fields
          </summary>
          <p>{schemaDomain.fields.join(", ")}</p>
        </details>
      )}
      {error && <p className="flow-error" role="alert">{error}</p>}
      {result && (
        <pre className="core-result">{JSON.stringify(result, null, 2)}</pre>
      )}
    </section>
  );
}

function parseObject(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("요청 body는 JSON object여야 합니다.");
  }
  return parsed as Record<string, unknown>;
}

function riskLabel(operation: CoreOperation) {
  if (operation.risk === "read") return "조회";
  if (operation.risk === "write") return "변경 · step-up";
  if (operation.risk === "destructive") return "삭제 · 명시 확인";
  return "외부 효과 · routine 차단";
}

function defaultBody(operation: CoreOperation | undefined) {
  if (!operation || operation.request_fields.length === 0) return "{}";
  return JSON.stringify(
    Object.fromEntries(
      operation.request_required_fields.map((field) => [field, ""]),
    ),
    null,
    2,
  );
}
