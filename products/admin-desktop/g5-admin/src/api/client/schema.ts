import type { AdminSchemaCatalogResponse } from "../../types/AdminSchemaCatalogResponse";
import type { AdminSchemaDetailResponse } from "../../types/AdminSchemaDetailResponse";
import { invokeCommand } from "./core";

export async function getAdminFieldSchemaCatalog(): Promise<AdminSchemaCatalogResponse> {
  return invokeCommand<AdminSchemaCatalogResponse>("cmd_admin_schema_get_catalog");
}

export async function getAdminFieldSchema(
  domain: string,
): Promise<AdminSchemaDetailResponse> {
  return invokeCommand<AdminSchemaDetailResponse>("cmd_admin_schema_get", {
    domain,
  });
}
