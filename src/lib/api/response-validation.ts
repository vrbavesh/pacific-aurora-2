import * as generatedSchemas from "./schemas";

interface RuntimeSchema {
  parse(value: unknown): unknown;
}

const schemaExports = generatedSchemas as unknown as Record<
  string,
  RuntimeSchema | unknown
>;

const routeNames: Array<[RegExp, string]> = [
  [/^\/api\/auth\/signup$/, "AuthSignup"],
  [/^\/api\/auth\/otp\/verify$/, "AuthOtpVerify"],
  [/^\/api\/auth\/otp\/resend$/, "AuthOtpResend"],
  [/^\/api\/auth\/signin$/, "AuthSignin"],
  [/^\/api\/auth\/google$/, "AuthGoogle"],
  [/^\/api\/auth\/forgot-password$/, "AuthForgotPassword"],
  [/^\/api\/auth\/password\/reset$/, "AuthPasswordReset"],
  [/^\/api\/auth\/logout$/, "AuthLogout"],
  [/^\/api\/auth\/account$/, "AuthAccount"],
  [/^\/api\/auth\/session$/, "AuthSession"],
  [/^\/api\/profiles\/me$/, "ProfilesMe"],
  [
    /^\/api\/books\/[^/]+\/chapters\/[^/]+\/important-points\/[^/]+$/,
    "BooksBookIdChaptersChapterIdImportantPointsPointId",
  ],
  [
    /^\/api\/books\/[^/]+\/chapters\/[^/]+\/important-points$/,
    "BooksBookIdChaptersChapterIdImportantPoints",
  ],
  [
    /^\/api\/books\/[^/]+\/chapters\/[^/]+\/move$/,
    "BooksBookIdChaptersChapterIdMove",
  ],
  [
    /^\/api\/books\/[^/]+\/chapters\/[^/]+$/,
    "BooksBookIdChaptersChapterId",
  ],
  [/^\/api\/books\/[^/]+\/chapters$/, "BooksBookIdChapters"],
  [/^\/api\/books\/[^/]+\/open$/, "BooksBookIdOpen"],
  [/^\/api\/books\/[^/]+$/, "BooksBookId"],
  [
    /^\/api\/characters\/[^/]+\/timelines\/[^/]+\/points\/[^/]+$/,
    "CharactersEntityIdTimelinesTimelineIdPointsPointId",
  ],
  [
    /^\/api\/characters\/[^/]+\/timelines\/[^/]+\/points$/,
    "CharactersEntityIdTimelinesTimelineIdPoints",
  ],
  [/^\/api\/characters\/[^/]+\/timelines$/, "CharactersEntityIdTimelines"],
  [/^\/api\/characters\/[^/]+$/, "CharactersEntityId"],
  [
    /^\/api\/custom-entity-types\/[^/]+\/attributes$/,
    "CustomEntityTypesTypeIdAttributes",
  ],
  [/^\/api\/custom-entity-types\/[^/]+$/, "CustomEntityTypesTypeId"],
  [/^\/api\/custom-entities\/[^/]+$/, "CustomEntitiesEntityId"],
  [/^\/api\/relationships\/[^/]+$/, "RelationshipsRelationshipId"],
  [/^\/api\/places\/[^/]+$/, "PlacesEntityId"],
  [/^\/api\/items\/[^/]+$/, "ItemsEntityId"],
  [
    /^\/api\/worlds\/[^/]+\/custom-entity-types$/,
    "WorldsWorldIdCustomEntityTypes",
  ],
  [
    /^\/api\/worlds\/[^/]+\/custom-entities$/,
    "WorldsWorldIdCustomEntities",
  ],
  [
    /^\/api\/worlds\/[^/]+\/relationships$/,
    "WorldsWorldIdRelationships",
  ],
  [/^\/api\/worlds\/[^/]+\/characters$/, "WorldsWorldIdCharacters"],
  [/^\/api\/worlds\/[^/]+\/places$/, "WorldsWorldIdPlaces"],
  [/^\/api\/worlds\/[^/]+\/items$/, "WorldsWorldIdItems"],
  [/^\/api\/worlds\/[^/]+\/books$/, "WorldsWorldIdBooks"],
  [/^\/api\/worlds\/[^/]+\/open$/, "WorldsWorldIdOpen"],
  [/^\/api\/worlds\/[^/]+$/, "WorldsWorldId"],
  [/^\/api\/worlds$/, "Worlds"],
];

function operationName(path: string, method: string): string | null {
  const pathname = new URL(path, "http://contract.local").pathname;
  const route = routeNames.find(([pattern]) => pattern.test(pathname));
  if (!route) return null;
  const verb = method.toLowerCase();
  const prefix = verb.charAt(0).toUpperCase() + verb.slice(1);
  return `${prefix}${route[1]}Response`;
}

export class ApiContractError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiContractError";
  }
}

export function validateSuccessResponse(
  path: string,
  method: string,
  value: unknown,
): unknown {
  const operation = operationName(path, method);
  const schema = operation ? schemaExports[operation] : undefined;
  if (!operation || !schema || typeof (schema as RuntimeSchema).parse !== "function") {
    throw new ApiContractError(
      `No generated response schema is registered for ${method.toUpperCase()} ${path}`,
    );
  }
  try {
    return (schema as RuntimeSchema).parse(value);
  } catch (cause) {
    throw new ApiContractError(
      `Response contract violation for ${method.toUpperCase()} ${path}`,
      { cause },
    );
  }
}
