import OpenAI from "openai";

import { Agent, LLMResult } from "../types";

export class LLMService {
  private openai: OpenAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.initializeOpenAI(apiKey);
    }
  }

  public initializeOpenAI(apiKey: string): void {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  public async processText(text: string, agent: Agent): Promise<LLMResult> {
    if (!this.openai) {
      throw new Error("OpenAI not initialized. Please set API key first.");
    }

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: agent.instruction,
        },
        {
          role: "user",
          content: text,
        },
      ];

      const completion = await this.openai.chat.completions.create({
        model: agent.model,
        messages: messages,
        temperature: agent.temperature,
        max_tokens: 4000,
      });

      const result = completion.choices[0]?.message?.content;
      if (!result) {
        throw new Error("No response from OpenAI");
      }

      return {
        text: result,
        model: agent.model,
        tokensUsed: completion.usage?.total_tokens || 0,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`LLM processing failed: ${errorMessage}`);
    }
  }

  public async processTextWithImage(
    text: string,
    imageUrl: string,
    agent: Agent
  ): Promise<LLMResult> {
    if (!this.openai) {
      throw new Error("OpenAI not initialized. Please set API key first.");
    }

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: agent.instruction,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: text,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ];

      const completion = await this.openai.chat.completions.create({
        model: agent.model,
        messages: messages,
        temperature: agent.temperature,
        max_tokens: 4000,
      });

      const result = completion.choices[0]?.message?.content;
      if (!result) {
        throw new Error("No response from OpenAI");
      }

      return {
        text: result,
        model: agent.model,
        tokensUsed: completion.usage?.total_tokens || 0,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`LLM processing with image failed: ${errorMessage}`);
    }
  }

  public async testConnection(): Promise<boolean> {
    if (!this.openai) {
      return false;
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5,
      });

      return completion.choices.length > 0;
    } catch (error) {
      return false;
    }
  }
}
