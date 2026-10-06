import type { PostcodeReference } from "./types";

export interface LookupResult {
  assigned: boolean;
  checkedAt?: string;
}
export type Lookup = (compactCode: string) => Promise<LookupResult>;

export async function verify(_input: string, _lookup: Lookup): Promise<PostcodeReference | null> {
  throw new Error("not implemented");
}
