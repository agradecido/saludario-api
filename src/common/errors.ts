export type ProblemCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: ProblemCode;
  request_id?: string;
  [key: string]: unknown;
}

function toProblemType(code: ProblemCode): string {
  return `https://api.saludario.local/problems/${code.toLowerCase()}`;
}

export function createProblem(
  status: number,
  code: ProblemCode,
  title: string,
  detail?: string,
  extras: Record<string, unknown> = {}
): ProblemDetails {
  return {
    type: toProblemType(code),
    title,
    status,
    detail,
    code,
    ...extras
  };
}
