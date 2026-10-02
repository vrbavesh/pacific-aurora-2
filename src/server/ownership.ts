import { NotFoundError } from "@/src/lib/api/errors";

export function ownedOr404<T>(resource: T | null | undefined): T {
  if (resource === null || resource === undefined) {
    throw new NotFoundError();
  }
  return resource;
}
