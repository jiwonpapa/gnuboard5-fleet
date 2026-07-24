import registryJson from "./core-operations.json";

export type CoreRisk = "read" | "write" | "destructive" | "external_effect";

export interface CoreParameter {
  name: string;
  location: "path" | "query";
  required: boolean;
  type: string;
}

export interface CoreOperation {
  operation_id: string;
  method: string;
  path: string;
  domain: string;
  tags: string[];
  risk: CoreRisk;
  transport: "specialized" | "core_proxy";
  requires_step_up: boolean;
  parameters: CoreParameter[];
  request_body_required: boolean;
  request_media_types: string[];
  request_fields: string[];
  request_required_fields: string[];
  response_fields: string[];
  schema_refs: string[];
}

export interface CoreSchemaField {
  name: string;
  type: string;
  required: boolean;
  nullable: boolean;
  read_only: boolean;
  write_only: boolean;
}

export interface CoreSchema {
  name: string;
  type: string;
  required: string[];
  fields: CoreSchemaField[];
}

export interface CoreSchemaDomain {
  domain: string;
  operation_ids: string[];
  schema_refs: string[];
  fields: string[];
  field_count: number;
}

export interface CoreRegistry {
  schema: "g5-fleet.core-operations/v1";
  counts: {
    active: number;
    admin_non_shop: number;
    bootstrap: number;
    shop: number;
    schemas: number;
    schema_domains: number;
  };
  operations: CoreOperation[];
  schemas: CoreSchema[];
  schema_domains: CoreSchemaDomain[];
}

export const coreRegistry = registryJson as CoreRegistry;

export const coreOperationById = new Map(
  coreRegistry.operations.map((operation) => [
    operation.operation_id,
    operation,
  ]),
);
