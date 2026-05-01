import { z } from 'zod';
import type { FieldDef } from '@/api/metadata';

/**
 * Build a Zod object schema from a list of FieldDefs.
 *
 * - Optional fields accept undefined or empty string (transformed to undefined).
 * - Required string-like fields enforce a non-empty value.
 * - PICKLIST/MULTI_PICKLIST validate against the option `value`s.
 * - NUMBER/DECIMAL coerce via `z.coerce.number()`.
 */
export function buildZodSchema(fields: FieldDef[]): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const f of fields) {
    let s: z.ZodTypeAny;

    switch (f.type) {
      case 'TEXT':
      case 'LONG_TEXT':
        s = z.string();
        break;
      case 'EMAIL':
        s = z.string().email();
        break;
      case 'URL':
        s = z.string().url();
        break;
      case 'PHONE':
        s = z.string().min(3);
        break;
      case 'NUMBER':
      case 'DECIMAL':
        s = z.coerce.number();
        break;
      case 'BOOLEAN':
        s = z.boolean();
        break;
      case 'DATE':
      case 'DATETIME':
        s = z.union([z.string(), z.date()]);
        break;
      case 'PICKLIST':
      case 'MULTI_PICKLIST': {
        const opts = (f.options as Array<{ value: string }> | undefined) ?? [];
        const values = opts.map((o) => o.value);
        if (values.length === 0) {
          s = f.type === 'MULTI_PICKLIST' ? z.array(z.string()) : z.string();
        } else {
          const enumSchema = z.enum(values as [string, ...string[]]);
          s = f.type === 'MULTI_PICKLIST' ? z.array(enumSchema) : enumSchema;
        }
        break;
      }
      case 'LOOKUP':
        s = z.string();
        break;
      case 'FILE':
        s = z.any();
        break;
      default:
        s = z.any();
    }

    if (f.required) {
      // Strings already in `s`: enforce non-empty.
      if (s instanceof z.ZodString) {
        // The min(1) message is the default "String must contain at least 1 character(s)"
        // but vee-validate handles it.
        const inner = s as z.ZodString;
        // PHONE already has min(3); skip if min already applied above.
        if (f.type !== 'PHONE') {
          s = inner.min(1);
        }
      }
    } else {
      // Optional fields: allow empty-string → undefined and absence.
      if (s instanceof z.ZodString) {
        s = z
          .union([z.string().length(0), s])
          .transform((v) => (v === '' ? undefined : v))
          .optional();
      } else {
        s = s.optional();
      }
    }

    shape[f.key] = s;
  }

  return z.object(shape);
}
