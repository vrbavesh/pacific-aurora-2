import { NextResponse } from "next/server";
import { adminClient } from "@/src/lib/api/admin";
import { ApiError, errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { readJson } from "@/src/server/http";

export async function DELETE(req: Request) {
  try {
    const c = await getContext(req);
    const body = await readJson(req);
    if (body.confirmation !== "DELETE") {
      throw new ValidationError('Type DELETE to permanently remove your account');
    }

    const admin = adminClient();
    if (!admin) {
      throw new ApiError(
        503,
        "service_unavailable",
        "Account deletion is temporarily unavailable",
      );
    }

    // Deleting auth.users cascades through profiles to all owned application data.
    const { error } = await admin.auth.admin.deleteUser(c.userId);
    if (error) throw new Error(`Could not delete account: ${error.message}`);

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
