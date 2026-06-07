type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

type ClientLogEntry = {
  timestamp: string;
  level: LogLevel;
  event: string;
  context?: LogContext;
  route: string;
  userAgent: string;
};

const LOG_ENDPOINT = "/__devlog";
const MAX_STRING_LENGTH = 240;

function safeContextValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`
      : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => safeContextValue(item));
  }

  if (value && typeof value === "object") {
    const safeObject: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      safeObject[key] = safeContextValue(nestedValue);
    }
    return safeObject;
  }

  return value;
}

function createLogEntry(level: LogLevel, event: string, context?: LogContext): ClientLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    context: context ? (safeContextValue(context) as LogContext) : undefined,
    route: window.location.pathname,
    userAgent: window.navigator.userAgent,
  };
}

async function sendLog(level: LogLevel, event: string, context?: LogContext): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.MODE === "test") {
    return;
  }

  const entry = createLogEntry(level, event, context);

  if (level === "error") {
    console.error(`[${event}]`, context ?? {});
  } else if (level === "warn") {
    console.warn(`[${event}]`, context ?? {});
  } else {
    console.log(`[${event}]`, context ?? {});
  }

  try {
    await fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entry),
      keepalive: true,
    });
  } catch {
    // Avoid throwing from logger to keep app behavior unchanged.
  }
}

export function logDebug(event: string, context?: LogContext): void {
  void sendLog("debug", event, context);
}

export function logInfo(event: string, context?: LogContext): void {
  void sendLog("info", event, context);
}

export function logWarn(event: string, context?: LogContext): void {
  void sendLog("warn", event, context);
}

export function logError(event: string, context?: LogContext): void {
  void sendLog("error", event, context);
}
