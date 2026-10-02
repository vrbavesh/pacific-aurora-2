import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/src/lib/api/generated";
import { ConflictError } from "@/src/lib/api/errors";
import type { ProfileRepository } from "./types";

type Row = Record<string, unknown>;
const s = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;
const b = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : undefined;

function toProfile(r: Row): Profile {
  return {
    id: s(r.id),
    username: s(r.username),
    userId: s(r.user_id),
    onboardingComplete: b(r.onboarding_complete),
    createdAt: s(r.created_at),
    updatedAt: s(r.updated_at),
  };
}

export class ProfileRepositoryImpl implements ProfileRepository {
  constructor(private supabase: SupabaseClient) {}
  async me(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toProfile(data as Row) : null;
  }
  async update(
    userId: string,
    patch: Partial<Pick<Profile, "username" | "userId">>,
  ): Promise<Profile> {
    const rest: Record<string, unknown> = {};
    if (patch.username !== undefined) rest.username = patch.username;
    if (patch.userId !== undefined) {
      const uid = patch.userId === "" ? null : patch.userId;
      rest.user_id = uid;
      rest.onboarding_complete = uid !== null;
    }
    const { data, error } = await this.supabase
      .from("profiles")
      .update(rest)
      .eq("id", userId)
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        throw new ConflictError("That userId is already taken");
      }
      throw new Error(error.message);
    }
    return toProfile(data as Row);
  }
}
