import type { Instrumentation } from "next";

/** Writes every server-side error as one JSON line, so a log collector or alert rule can pick it up. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const err = error as { message?: string; digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      event: "request_error",
      message: err.message ?? String(error),
      digest: err.digest,
      method: request.method,
      path: request.path.split("?")[0],
      route: context.routePath,
      routeType: context.routeType,
    }),
  );
};
