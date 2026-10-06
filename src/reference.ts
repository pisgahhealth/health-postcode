import type { PostcodeReference, ReferenceOptions } from "./types";

export function isFhirDateTime(_value: unknown): boolean {
  throw new Error("not implemented");
}

export function toReference(_input: string, _options?: ReferenceOptions): PostcodeReference | null {
  throw new Error("not implemented");
}

export function fromReference(_value: unknown): PostcodeReference | null {
  throw new Error("not implemented");
}
