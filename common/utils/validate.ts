/**
 * Request body validation on top of @dreamer/utils/validator.
 * `parseBody` returns the cleaned data or the list of failing field paths.
 */
import { validate, type Validator } from "@dreamer/utils/validator";

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; fields: string[] };

export function parseBody<T>(body: unknown, schema: Validator<T>): ParseResult<T> {
  const result = validate(body, schema);
  if (result.success) return { ok: true, data: result.data as T };
  return { ok: false, fields: [...new Set(result.errors.map((e) => e.path))] };
}
