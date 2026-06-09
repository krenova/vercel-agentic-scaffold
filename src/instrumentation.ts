import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';

interface TelemetrySdk {
  shutdown(): Promise<void>;
}

function isLangfuseEnabled(): boolean {
  const explicit = process.env.LANGFUSE_ENABLED?.toLowerCase();
  if (explicit === 'false' || explicit === '0' || explicit === 'off') return false;
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY &&
    process.env.LANGFUSE_SECRET_KEY &&
    process.env.LANGFUSE_BASE_URL,
  );
}

export const telemetryEnabled = isLangfuseEnabled();

// LangfuseSpanProcessor reads LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY,
// and LANGFUSE_BASE_URL automatically from environment variables when enabled.
const sdk: TelemetrySdk = telemetryEnabled
  ? new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] })
  : { async shutdown() { /* No telemetry configured. */ }, };

if (telemetryEnabled && sdk instanceof NodeSDK) {
  sdk.start();
}

export { sdk };
