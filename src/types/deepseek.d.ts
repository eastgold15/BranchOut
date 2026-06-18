import "openai";

declare module "openai/resources/chat/completions" {
  interface ChatCompletionCreateParamsBase {
    thinking?: {
      type: "enabled" | "disabled";
    };
    reasoning_effort?: "low" | "medium" | "high";
  }
}
