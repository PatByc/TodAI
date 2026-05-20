export const DATABASE_UNAVAILABLE_CODE = "TODAI-DB-001";
export const GENERIC_APP_ERROR_CODE = "TODAI-APP-001";

export function isDatabaseConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const text = `${error.name} ${error.message}`.toLowerCase();

  return (
    text.includes("prismaclientinitializationerror") ||
    text.includes("can't reach database server") ||
    text.includes("can not reach database server") ||
    text.includes("p1001")
  );
}
