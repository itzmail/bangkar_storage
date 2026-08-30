import { NextResponse } from "next/server";
import type { ErrorCode } from "@/lib/schemas";

export interface ApiErrorBody {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  STORAGE_LIMIT_EXCEEDED: 413,
  UNSUPPORTED_MIME_TYPE: 415,
  FILE_TOO_LARGE: 413,
  UPLOAD_FAILED: 502,
  EMAIL_TAKEN: 409,
  INVALID_CREDENTIALS: 401,
  INTERNAL_ERROR: 500,
};

export function apiError(code: ErrorCode, message: string): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status: STATUS_BY_CODE[code] },
  );
}
