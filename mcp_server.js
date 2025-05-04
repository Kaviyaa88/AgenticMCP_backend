import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

// Create an MCP server
const server = new McpServer({
  name: "Demo",
  version: "1.0.0",
});

// Define and register tools

// Addition Tool
server.tool(
  "addition-tool",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => {
    const schema = z.object({
      a: z.number(),
      b: z.number(),
    });
    schema.parse({ a, b });
    try {
      const result = a + b;
      return {
        content: [
          {
            type: "text",
            text: `Result of ${a} + ${b} = ${result}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error performing addition: ${error.message}` },
        ],
      };
    }
  }
);

// Weather Tool
server.tool(
  "weather-tool",
  { city: z.string().min(1) },
  async ({ city }) => {
    const schema = z.object({ city: z.string().min(1) });
    schema.parse({ city });
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPENWEATHERMAP_API_KEY}`
      );
      const data = await response.json();
      if (response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Weather in ${city}: ${data.weather[0].description}, Temperature: ${(data.main.temp - 273.15).toFixed(1)}°C`,
            },
          ],
        };
      } else {
        return {
          content: [
            { type: "text", text: `Error fetching weather for ${city}: ${data.message}` },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error fetching weather for ${city}: ${error.message}` },
        ],
      };
    }
  }
);

// Dummy Tool
server.tool(
  "dummy-tool",
  { input: z.string().min(1) },
  async ({ input }) => {
    const schema = z.object({ input: z.string().min(1) });
    schema.parse({ input });
    try {
      const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
      const model = new ChatGoogleGenerativeAI({
        model: "gemini-1.5-pro",
        apiKey: process.env.GOOGLE_API_KEY,
      });
      const response = await model.invoke([
        ["system", "You are a helpful assistant responding to general queries."],
        ["human", input],
      ]);
      return {
        content: [
          { type: "text", text: response.content },
        ],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error processing query: ${error.message}` },
        ],
      };
    }
  }
);

// Export start function
async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("startMcpServer connected")
}
startMcpServer().catch(console.error);
