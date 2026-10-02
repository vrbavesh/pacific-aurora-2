import { NextResponse } from "next/server";
import { errorResponse, NotFoundError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { ProfileRepositoryImpl } from "@/src/server/repositories/supabase-profile";
import { profileService } from "@/src/server/services";

export async function GET(req: Request) {
  try {
    const c = await getContext(req);
    const svc = profileService(new ProfileRepositoryImpl(c.supabase));
    const profile = await svc.me(c.userId).catch((e) => {
      if (e instanceof NotFoundError) return null;
      throw e;
    });
    return NextResponse.json({ data: { user: { id: c.userId }, profile } });
  } catch (e) {
    return errorResponse(e);
  }
}
