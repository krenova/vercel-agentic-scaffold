import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';

// LangfuseSpanProcessor reads LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY,
// and LANGFUSE_BASE_URL automatically from environment variables.
const sdk = new NodeSDK({
  spanProcessors: [new LangfuseSpanProcessor()],
});

sdk.start();

export { sdk };
