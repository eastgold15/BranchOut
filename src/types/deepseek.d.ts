import "openai";

declare module "openai/resources/chat/completions" {
  interface ChatCompletionCreateParamsBase {
    reasoning_effort?: "low" | "medium" | "high";
    thinking?: {
      type: "enabled" | "disabled";
    };
  }
}
