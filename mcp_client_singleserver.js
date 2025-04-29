import express from "express";
import cors from "cors"; // Import cors
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { loadMcpTools } from "@langchain/mcp-adapters";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies and enable CORS
app.use(express.json());
app.use(cors()); // Add CORS middleware

const model = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
});

const client = new Client({
  name: "demo-client",
  version: "1.0.0",
});

const transport = new StdioClientTransport({
  command: "node",
  args: ["mcp_server.js"], // Replace with actual path to server script
});

// Connect to the MCP server and load tools once at startup
let agent;
async function initializeAgent() {
  try {
    // console.log("initialization", client);
    // console.log("transport", transport);
    const clientcon = await client.connect(transport);
    const tools = await loadMcpTools("Demo", client, {
      throwOnLoadError: true,
      prefixToolNameWithServerName: false,
      additionalToolNamePrefix: "",
    });
    console.log("tools", tools);
    agent = createReactAgent({ llm: model, tools });
    console.log("MCP client and agent initialized successfully");
  } catch (error) {
    console.error("Failed to initialize MCP client:", error);
    process.exit(1); // Exit if initialization fails, or handle differently as needed
  }
}

// Run initialization
initializeAgent();

// POST endpoint to handle prompt
app.post("/api/generate", async (req, res) => {
  try {
    console.log("Received request:", req.body);
    const { prompt } = req.body;
    // Invoke the agent with the prompt
    const agentResponse = await agent.invoke({
      messages: [{ role: "user", content: prompt }],
    });
    console.log("agentResponse", agentResponse);

    const aiMessageContents = agentResponse.messages
      .filter((message) => message.__proto__.constructor.name === "AIMessage") // Check for AIMessage type
      .map((message) => message.content);
    console.log("aiMessageContents", aiMessageContents);

    // Send the response back to the client
    res.json({
      response: aiMessageContents,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await client.close();
  process.exit(0);
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});