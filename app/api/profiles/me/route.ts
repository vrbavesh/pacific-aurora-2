import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalName, readJson } from "@/src/server/http";
import { ProfileRepositoryImpl } from "@/src/server/repositories/supabase-profile";
import { profileService } from "@/src/server/services";

export async function GET(req: Request) {
  try {
    const c = await getContext(req);
    const svc = profileService(new ProfileRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.me(c.userId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const c = await getContext(req);
    const body = await readJson(req);
    const username = optionalName(body);
    let userId: string | undefined;
    if (body.userId !== undefined) {
      if (typeof body.userId !== "string") {
        throw new ValidationError("userId must be a string");
      }
      userId = body.userId;
    }
    if (username === undefined && userId === undefined) {
      throw new ValidationError("Provide username and/or userId");
    }
    const svc = profileService(new ProfileRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.update(c.userId, { username, userId }) });
  } catch (e) {
    return errorResponse(e);
  }
}
