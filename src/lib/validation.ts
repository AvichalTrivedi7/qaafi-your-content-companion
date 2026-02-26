import { z } from 'zod';

// Shared regex: allows letters (any script), digits, spaces, hyphens, dots, ampersands, commas
const safeTextRegex = /^[a-zA-Z0-9\u00C0-\u024F\u0600-\u06FF\s\-.,&()/#]+$/;

export const companyNameSchema = z
  .string()
  .trim()
  .min(2, 'Company name must be at least 2 characters')
  .max(100, 'Company name must be less than 100 characters')
  .regex(safeTextRegex, 'Company name contains invalid characters');

export const inventoryNameSchema = z
  .string()
  .trim()
  .min(1, 'Product name is required')
  .max(200, 'Product name must be less than 200 characters')
  .regex(safeTextRegex, 'Product name contains invalid characters');

export const inventorySkuSchema = z
  .string()
  .trim()
  .min(1, 'SKU is required')
  .max(50, 'SKU must be less than 50 characters')
  .regex(/^[\w\-\.]+$/, 'SKU can only contain letters, numbers, hyphens, dots, and underscores');

export const inventoryDescriptionSchema = z
  .string()
  .max(1000, 'Description must be less than 1000 characters')
  .optional()
  .or(z.literal(''));

export const customerNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(200, 'Name must be less than 200 characters')
  .regex(safeTextRegex, 'Name contains invalid characters');

export const destinationSchema = z
  .string()
  .trim()
  .min(1, 'Destination is required')
  .max(500, 'Destination must be less than 500 characters');

export const positiveIntSchema = z
  .number()
  .int('Must be a whole number')
  .min(1, 'Must be at least 1')
  .max(999999, 'Value too large');

export const thresholdSchema = z
  .number()
  .int('Must be a whole number')
  .min(0, 'Cannot be negative')
  .max(999999, 'Value too large');

/**
 * Validate a value against a schema and return error message or null.
 */
export function validateField<T>(schema: z.ZodSchema<T>, value: unknown): string | null {
  const result = schema.safeParse(value);
  return result.success ? null : result.error.errors[0].message;
}
