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

export class ProblemError extends Error {
  readonly statusCode: number;
  readonly problemCode: ProblemCode;
  readonly title: string;
  readonly detail?: string;
  readonly extras: Record<string, unknown>;

  constructor(
    statusCode: number,
    problemCode: ProblemCode,
    title: string,
    detail?: string,
    extras: Record<string, unknown> = {}
  ) {
    super(detail ?? title);
    this.name = "ProblemError";
    this.statusCode = statusCode;
    this.problemCode = problemCode;
    this.title = title;
    this.detail = detail;
    this.extras = extras;
  }
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

export function createProblemError(
  statusCode: number,
  problemCode: ProblemCode,
  title: string,
  detail?: string,
  extras: Record<string, unknown> = {}
): ProblemError {
  return new ProblemError(statusCode, problemCode, title, detail, extras);
}
