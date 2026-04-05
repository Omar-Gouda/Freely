import { MockAiProvider } from "@/lib/ai/mock-provider";
import { OpenAiProvider } from "@/lib/ai/openai-provider";
import { env } from "@/lib/env";

export const aiProvider = env.AI_PROVIDER === "openai" ? new OpenAiProvider() : new MockAiProvider();
