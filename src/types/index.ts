export * from "./auth.types";
export * from "./archive.types";
export * from "./user.types";
export * from "./log.types";
export * from "./client.types";

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}
