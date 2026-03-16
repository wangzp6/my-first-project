import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js"
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import { z } from "zod";

export default function createMcpServer(ak: string) {
    const server = new McpServer({
        name: "test-mcp",
        version: "1.0.0",
        description: "测试mcp"
    })

    server.registerTool(
        "calculate-bmi",
        {
            title: "BMI Calculator",
            description: "Calculate Body Mass Index",
            inputSchema: {
                weightKg: z.number(),
                heightM: z.number()
            }
        },
        async ({ weightKg, heightM }) => ({
            content: [{
                type: "text",
                text: String(weightKg / (heightM * heightM))
            }]
        })
    );

    // Async tool with external API call
    server.registerTool(
        "fetch-weather",
        {
            title: "Weather Fetcher",
            description: "Get weather data for a city",
            inputSchema: { city: z.string() }
        },
        async ({ city }) => {
            const response = await fetch(`https://api.weather.com/${city}`);
            const data = await response.text();
            return {
                content: [{ type: "text", text: data }]
            };
        }
    );

    // Tool that returns ResourceLinks
    server.registerTool(
        "list-files",
        {
            title: "List Files",
            description: "List project files",
            inputSchema: { pattern: z.string() }
        },
        async ({ pattern }) => ({
            content: [
                { type: "text", text: `Found files matching "${pattern}":` },
                // ResourceLinks let tools return references without file content
                {
                    type: "resource_link",
                    uri: "file:///project/README.md",
                    name: "README.md",
                    mimeType: "text/markdown",
                    description: 'A README file'
                },
                {
                    type: "resource_link",
                    uri: "file:///project/src/index.ts",
                    name: "index.ts",
                    mimeType: "text/typescript",
                    description: 'An index file'
                }
            ]
        })
    );


    // Static resource
    server.registerResource(
        "config",
        "config://app",
        {
            title: "Application Config",
            description: "Application configuration data",
            mimeType: "text/plain"
        },
        async (uri) => ({
            contents: [{
                uri: uri.href,
                text: "App configuration here"
            }]
        })
    );

    // Dynamic resource with parameters
    server.registerResource(
        "user-profile",
        new ResourceTemplate("users://{userId}/profile", { list: undefined }),
        {
            title: "User Profile",
            description: "User profile information"
        },
        async (uri, { userId }) => ({
            contents: [{
                uri: uri.href,
                text: `Profile data for user ${userId}`
            }]
        })
    );

    // Resource with context-aware completion
    server.registerResource(
        "repository",
        new ResourceTemplate("github://repos/{owner}/{repo}", {
            list: undefined,
            complete: {
                // Provide intelligent completions based on previously resolved parameters
                repo: (value, context) => {
                    if (context?.arguments?.["owner"] === "org1") {
                        return ["project1", "project2", "project3"].filter(r => r.startsWith(value));
                    }
                    return ["default-repo"].filter(r => r.startsWith(value));
                }
            }
        }),
        {
            title: "GitHub Repository",
            description: "Repository information"
        },
        async (uri, { owner, repo }) => ({
            contents: [{
                uri: uri.href,
                text: `Repository: ${owner}/${repo}`
            }]
        })
    );



    server.registerPrompt(
        "review-code",
        {
            title: "Code Review",
            description: "Review code for best practices and potential issues",
            argsSchema: { code: z.string() }
        },
        ({ code }) => ({
            messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: `Please review this code:\n\n${code}`
                }
            }]
        })
    );

    // Prompt with context-aware completion
    server.registerPrompt(
        "team-greeting",
        {
            title: "Team Greeting",
            description: "Generate a greeting for team members",
            argsSchema: {
                department: completable(z.string(), (value) => {
                    // Department suggestions
                    return ["engineering", "sales", "marketing", "support"].filter(d => d.startsWith(value));
                }),
                name: completable(z.string(), (value, context) => {
                    // Name suggestions based on selected department
                    const department = context?.arguments?.["department"];
                    if (department === "engineering") {
                        return ["Alice", "Bob", "Charlie"].filter(n => n.startsWith(value));
                    } else if (department === "sales") {
                        return ["David", "Eve", "Frank"].filter(n => n.startsWith(value));
                    } else if (department === "marketing") {
                        return ["Grace", "Henry", "Iris"].filter(n => n.startsWith(value));
                    }
                    return ["Guest"].filter(n => n.startsWith(value));
                })
            }
        },
        ({ department, name }) => ({
            messages: [{
                role: "assistant",
                content: {
                    type: "text",
                    text: `Hello ${name}, welcome to the ${department} team!`
                }
            }]
        })
    );
    return server
}

