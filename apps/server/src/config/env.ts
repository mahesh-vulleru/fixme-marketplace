import path from 'path';
import dotenv from 'dotenv';
import { ServerEnvSchema, ServerEnv } from '@fixme/validation';

// Load apps/server/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates environment variables using the shared Zod schema.
 * Throws a descriptive error if any required variable is missing or invalid.
 */
export function validateServerEnv(rawEnv: NodeJS.ProcessEnv = process.env): ServerEnv {
  const parsed = ServerEnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const missingOrInvalid = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    const errorMessage = `❌ [FixMe Startup Failure] Invalid or missing environment variables:\n${missingOrInvalid}`;
    throw new Error(errorMessage);
  }

  return parsed.data;
}

export const env: ServerEnv = validateServerEnv(process.env);

export function getEnv(): ServerEnv {
  return env;
}
