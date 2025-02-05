import { Chat } from "./chat";
import { Configuration, OpenAIApi } from "openai";

export class AIBot extends Chat {
  private openai: OpenAIApi;

  constructor() {
    super();
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  generateMessage(): string {
    const messages = [
      "Hello everyone!",
      "How's it going?",
      "What's up?",
      "Anyone here?",
      "Good day!"
    ];
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }

  async fetchResponseFromAPI(): Promise<string> {
    const response = await this.openai.createCompletion({
      model: "text-davinci-003",
      prompt: "Generate a chat message",
      max_tokens: 50,
    });
    return response.data.choices[0].text.trim();
  }

  async sendMessage(): Promise<void> {
    const timestamp: string = Date.now().toString();
    const message: string = await this.fetchResponseFromAPI();
    const senderId: string = "AI_Bot";
    this.addMessage(timestamp, message, senderId);
  }
}
