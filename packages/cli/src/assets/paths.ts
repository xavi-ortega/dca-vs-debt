import path from "path";

export function repoRootDir(): string {
  // packages/cli -> repo root
  return path.resolve(process.cwd(), "../..");
}
