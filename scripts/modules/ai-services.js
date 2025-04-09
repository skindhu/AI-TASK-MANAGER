/**
 * ai-services.js
 * AI service interactions for the Task Master CLI
 */

// NOTE/TODO: Include the beta header output-128k-2025-02-19 in your API request to increase the maximum output token length to 128k tokens for Claude 3.7 Sonnet.

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { CONFIG, log, sanitizePrompt } from './utils.js';
import { startLoadingIndicator, stopLoadingIndicator } from './ui.js';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

function getGeminiOptions() {
  const proxyUrl = CONFIG.geminiBaseUrl;

  // 如果useProxy为true且存在代理URL，则使用代理
  if (proxyUrl) {
    console.log(`使用Gemini API代理: ${proxyUrl}`);
    return { baseUrl: proxyUrl };
  }

  console.log("使用默认Gemini API端点");
  return {};
}

// Configure Google Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-pro-exp-03-25",
  generationConfig: {
    temperature: CONFIG.temperature,
    maxOutputTokens: CONFIG.maxTokens,
  },
}, {...getGeminiOptions(), apiVersion: 'v1beta'});

// Lazy-loaded Perplexity client
let perplexity = null;

/**
 * Get or initialize the Perplexity client
 * @returns {OpenAI} Perplexity client
 */
function getPerplexityClient() {
  if (!perplexity) {
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY environment variable is missing. Set it to use research-backed features.");
    }
    perplexity = new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    });
  }
  return perplexity;
}

/**
 * Handle Gemini API errors with user-friendly messages
 * @param {Error} error - The error from Gemini API
 * @returns {string} User-friendly error message
 */
function handleGeminiError(error) {
  // Check for specific Gemini error types
  if (error.details) {
    switch (error.details.code) {
      case 'RESOURCE_EXHAUSTED':
        return 'Gemini quota has been exhausted. Please check your API quota and try again later.';
      case 'PERMISSION_DENIED':
        return 'Permission denied accessing Gemini API. Please check your API key and permissions.';
      case 'INVALID_ARGUMENT':
        return 'There was an issue with the request format. If this persists, please report it as a bug.';
      default:
        return `Gemini API error: ${error.message}`;
    }
  }

  // Check for network/timeout errors
  if (error.message?.toLowerCase().includes('timeout')) {
    return 'The request to Gemini timed out. Please try again.';
  }
  if (error.message?.toLowerCase().includes('network')) {
    return 'There was a network error connecting to Gemini. Please check your internet connection and try again.';
  }

  // Default error message
  return `Error communicating with Gemini: ${error.message}`;
}

/**
 * Call Gemini to generate tasks from a PRD
 * @param {string} prdContent - PRD content
 * @param {string} prdPath - Path to the PRD file
 * @param {number} numTasks - Number of tasks to generate
 * @param {number} retryCount - Retry count
 * @param {string} knowledgeBase - Optional business knowledge context
 * @returns {Object} Gemini's response
 */
async function callGemini(prdContent, prdPath, numTasks, retryCount = 0, knowledgeBase = null) {
  try {
    log('info', 'Calling Gemini...');

    // Build the standard task structure
    let taskStructure = `{
  "id": number,
  "title": string,
  "titleTrans": string (Chinese translation of title),
  "description": string,
  "descriptionTrans": string (Chinese translation of description),
  "status": "pending",
  "dependencies": number[] (IDs of tasks this depends on),
  "priority": "high" | "medium" | "low",
  "details": string (implementation details),
  "detailsTrans": string (Chinese translation of details),
  "testStrategy": string (validation approach),
  "testStrategyTrans": string (Chinese translation of test strategy)
}`;

    // Additional translation guidelines for Chinese mode
    const translationGuidelines = CONFIG.useChinese ? `
11. Provide Chinese translations for each task's title, description, details, and test strategy fields
12. The titleTrans field should contain a natural, fluent Chinese translation of the English title
13. The descriptionTrans field should contain a natural, fluent Chinese translation of the English description
14. The detailsTrans field should contain a natural, fluent Chinese translation of the English details
15. The testStrategyTrans field should contain a natural, fluent Chinese translation of the English test strategy
16. Keep all original English content intact in the primary fields (title, description, details, testStrategy)
17. Ensure all technical terms are correctly translated` : '';

    // Build the system prompt
    const systemPrompt = `You are an AI assistant helping to break down a Product Requirements Document (PRD) into a set of sequential development tasks.
Your goal is to create ${numTasks} well-structured, actionable development tasks based on the PRD provided.

Each task should follow this JSON structure:
${taskStructure}

Guidelines:
1. Create exactly ${numTasks} tasks, numbered from 1 to ${numTasks}
2. Each task should be atomic and focused on a single responsibility
3. Order tasks logically - consider dependencies and implementation sequence
4. Early tasks should focus on setup, core functionality first, then advanced features
5. Include clear validation/testing approach for each task
6. Set appropriate dependency IDs (a task can only depend on tasks with lower IDs)
7. Assign priority (high/medium/low) based on criticality and dependency order
8. Include detailed implementation guidance in the "details" field${knowledgeBase ? `
9. USE THE PROVIDED BUSINESS KNOWLEDGE AS A CRITICAL REFERENCE for terminology, domain concepts, and implementation requirements
10. Ensure all tasks align with the business knowledge context and follow domain-specific patterns` : ''}${translationGuidelines}

Expected output format:
{
  "tasks": [
    {
      "id": 1,
      "title": "Setup Project Repository",
      "description": "...",
      ...
    },
    ...
  ],
  "metadata": {
    "projectName": "PRD Implementation",
    "totalTasks": ${numTasks},
    "sourceFile": "${prdPath}",
    "generatedAt": "YYYY-MM-DD"
  }
}

Important: Your response must be valid JSON only, with no additional explanation or comments.`;

    // Use request to handle large responses and show progress
    return await handleRequest(prdContent, prdPath, numTasks, CONFIG.maxTokens, systemPrompt, knowledgeBase);
  } catch (error) {
    // Get user-friendly error message
    const userMessage = handleGeminiError(error);
    log('error', userMessage);

    // Retry logic for certain errors
    if (retryCount < 2 && (
      error.details?.code === 'RESOURCE_EXHAUSTED' ||
      error.message?.toLowerCase().includes('timeout') ||
      error.message?.toLowerCase().includes('network')
    )) {
      const waitTime = (retryCount + 1) * 5000; // 5s, then 10s
      log('info', `Waiting ${waitTime/1000} seconds before retry ${retryCount + 1}/2...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return await callGemini(prdContent, prdPath, numTasks, retryCount + 1, knowledgeBase);
    } else {
      console.error(chalk.red(userMessage));
      if (CONFIG.debug) {
        log('debug', 'Full error:', error);
      }
      throw new Error(userMessage);
    }
  }
}

/**
 * Handle request to Gemini
 * @param {string} prdContent - PRD content
 * @param {string} prdPath - Path to the PRD file
 * @param {number} numTasks - Number of tasks to generate
 * @param {number} maxTokens - Maximum tokens
 * @param {string} systemPrompt - System prompt
 * @param {string} knowledgeBase - Optional business knowledge context
 * @returns {Object} Gemini's response
 */
async function handleRequest(prdContent, prdPath, numTasks, maxTokens, systemPrompt, knowledgeBase = null) {
  const loadingIndicator = startLoadingIndicator('Generating tasks from PRD...');
  let responseText = '';

  try {
    // Combine system prompt and user content with optional knowledge base
    let fullPrompt = '';

    if (knowledgeBase) {
      fullPrompt = `${systemPrompt}\n\n${knowledgeBase}\n\nHere's the Product Requirements Document (PRD) to break down into ${numTasks} tasks:\n\n${prdContent}`;
      log('info', 'Sending request to Gemini with business knowledge context...');
    } else {
      fullPrompt = `${systemPrompt}\n\nHere's the Product Requirements Document (PRD) to break down into ${numTasks} tasks:\n\n${prdContent}`;
      log('info', 'Sending request to Gemini...');
    }

    // Regular dots animation to show progress
    let dotCount = 0;
    const readline = await import('readline');
    const animationInterval = setInterval(() => {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`Waiting for response from Gemini${'.'.repeat(dotCount)}`);
      dotCount = (dotCount + 1) % 4;
    }, 500);

    // Make non-streaming request
    const result = await geminiModel.generateContent(fullPrompt);
    clearInterval(animationInterval);

    // Get the text from response
    responseText = result.response.text();

    stopLoadingIndicator(loadingIndicator);
    log('info', "Completed non-streaming response from Gemini API!");

    return processClaudeResponse(responseText, numTasks, 0, prdContent, prdPath);
  } catch (error) {
    stopLoadingIndicator(loadingIndicator);

    // Get user-friendly error message
    const userMessage = handleGeminiError(error);
    log('error', userMessage);
    console.error(chalk.red(userMessage));

    if (CONFIG.debug) {
      log('debug', 'Full error:', error);
    }

    throw new Error(userMessage);
  }
}

/**
 * Process Gemini's response
 * @param {string} textContent - Text content from Gemini
 * @param {number} numTasks - Number of tasks
 * @param {number} retryCount - Retry count
 * @param {string} prdContent - PRD content
 * @param {string} prdPath - Path to the PRD file
 * @returns {Object} Processed response
 */
function processClaudeResponse(textContent, numTasks, retryCount, prdContent, prdPath) {
  try {
    // Attempt to parse the JSON response
    let jsonStart = textContent.indexOf('{');
    let jsonEnd = textContent.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Could not find valid JSON in Gemini's response");
    }

    let jsonContent = textContent.substring(jsonStart, jsonEnd + 1);
    let parsedData = JSON.parse(jsonContent);

    // Validate the structure of the generated tasks
    if (!parsedData.tasks || !Array.isArray(parsedData.tasks)) {
      throw new Error("Gemini's response does not contain a valid tasks array");
    }

    // Ensure we have the correct number of tasks
    if (parsedData.tasks.length !== numTasks) {
      log('warn', `Expected ${numTasks} tasks, but received ${parsedData.tasks.length}`);
    }

    // Add metadata if missing
    if (!parsedData.metadata) {
      parsedData.metadata = {
        projectName: "PRD Implementation",
        totalTasks: parsedData.tasks.length,
        sourceFile: prdPath,
        generatedAt: new Date().toISOString().split('T')[0]
      };
    }

    return parsedData;
  } catch (error) {
    log('error', "Error processing Gemini's response:", error.message);

    // Retry logic
    if (retryCount < 2) {
      log('info', `Retrying to parse response (${retryCount + 1}/2)...`);

      // Try again with Gemini for a cleaner response
      if (retryCount === 1) {
        log('info', "Calling Gemini again for a cleaner response...");
        return callGemini(prdContent, prdPath, numTasks, retryCount + 1);
      }

      return processClaudeResponse(textContent, numTasks, retryCount + 1, prdContent, prdPath);
    } else {
      // Create a fallback response with empty tasks
      log('warn', 'Failed to process after retries. Creating fallback task structure.');

      const tasks = [];
      for (let i = 1; i <= numTasks; i++) {
        const task = {
          id: i,
          title: `Task ${i}`,
          description: `Task ${i} generated as fallback due to parsing error.`,
          status: 'pending',
          dependencies: i > 1 ? [i - 1] : [],
          priority: 'medium',
          details: 'Please fill in the implementation details for this task.',
          testStrategy: 'Manual verification.'
        };

        // Add Chinese translation fields if enabled
        if (CONFIG.useChinese) {
          task.titleTrans = `任务 ${i}`;
          task.descriptionTrans = `因解析错误而生成的备用任务 ${i}。`;
          task.detailsTrans = '请为此任务填写实现细节。';
          task.testStrategyTrans = '';
        }

        tasks.push(task);
      }

      const fallbackResponse = {
        tasks: tasks,
        metadata: {
          projectName: "PRD Implementation",
          totalTasks: numTasks,
          sourceFile: prdPath,
          generatedAt: new Date().toISOString().split('T')[0],
          note: "Generated as fallback due to parsing error."
        }
      };

      return fallbackResponse;
    }
  }
}

/**
 * Generate subtasks for a task
 * @param {Object} task - Task to generate subtasks for
 * @param {number} numSubtasks - Number of subtasks to generate
 * @param {number} nextSubtaskId - Next subtask ID
 * @param {string} additionalContext - Additional context
 * @param {string} knowledgeBase - Optional business knowledge context
 * @returns {Array} Generated subtasks
 */
async function generateSubtasks(task, numSubtasks, nextSubtaskId, additionalContext = '', knowledgeBase = null) {
  try {
    log('info', `Generating ${numSubtasks} subtasks for task ${task.id}: ${task.title}`);

    const loadingIndicator = startLoadingIndicator(`Generating subtasks for task ${task.id}...`);
    let responseText = '';

    const systemPrompt = `You are an AI assistant helping with task breakdown for software development.
You need to break down a high-level task into ${numSubtasks} specific subtasks that can be implemented one by one.

Subtasks should:
1. Be specific and actionable implementation steps
2. Follow a logical sequence
3. Each handle a distinct part of the parent task
4. Include clear guidance on implementation approach
5. Have appropriate dependency chains between subtasks
6. Collectively cover all aspects of the parent task${knowledgeBase ? `
7. UTILIZE THE PROVIDED BUSINESS KNOWLEDGE as a critical reference for terminology and implementation details
8. Ensure all subtasks align with domain-specific patterns and concepts from the business knowledge` : ''}

For each subtask, provide:
- A clear, specific title
- Detailed implementation steps
- Dependencies on previous subtasks
- Testing approach

Each subtask should be implementable in a focused coding session.`;

    const contextPrompt = additionalContext ?
      `\n\nAdditional context to consider: ${additionalContext}` : '';

    // Standard JSON structure without translations
    let jsonStructureExample = `[
  {
    "id": ${nextSubtaskId},
    "title": "First subtask title",
    "description": "Detailed description",
    "dependencies": [],
    "details": "Implementation details"
  },
  ...more subtasks...
]`;

    // JSON structure with Chinese translations if enabled
    if (CONFIG.useChinese) {
      jsonStructureExample = `[
  {
    "id": ${nextSubtaskId},
    "title": "First subtask title",
    "titleTrans": "第一个子任务标题",
    "description": "Detailed description",
    "descriptionTrans": "描述的中文翻译",
    "dependencies": [],
    "details": "Implementation details",
    "detailsTrans": "实现细节的中文翻译",
    "testStrategy": "Verification approach",
    "testStrategyTrans": "验证方法的中文翻译"
  },
  ...more subtasks...
]`;
    }

    const translationInstruction = CONFIG.useChinese ? `
IMPORTANT: For each subtask, also provide Chinese translations for the title, description, details, and test strategy fields.
These translations should be natural and fluent Chinese that accurately conveys the original English content.
Include these translations in the "titleTrans", "descriptionTrans", "detailsTrans", and "testStrategyTrans" fields in the JSON response.` : '';

    const userPrompt = `Please break down this task into ${numSubtasks} specific, actionable subtasks:

Task ID: ${task.id}
Title: ${task.title}
Description: ${task.description}
Current details: ${task.details || 'None provided'}
${contextPrompt}${translationInstruction}

Return exactly ${numSubtasks} subtasks with the following JSON structure:
${jsonStructureExample}

Note on dependencies: Subtasks can depend on other subtasks with lower IDs. Use an empty array if there are no dependencies.`;

    try {
      // Regular dots animation to show progress
      let dotCount = 0;
      const readline = await import('readline');
      const animationInterval = setInterval(() => {
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`Generating subtasks for task ${task.id}${'.'.repeat(dotCount)}`);
        dotCount = (dotCount + 1) % 4;
      }, 500);

      // Combine system prompt, knowledge base (if any), and user prompt for Gemini
      let fullPrompt = '';
      if (knowledgeBase) {
        log('info', 'Including business knowledge context in subtask generation');
        fullPrompt = `${systemPrompt}\n\n${knowledgeBase}\n\n${userPrompt}`;
      } else {
        fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      }

      // Use non-streaming API call
      const result = await geminiModel.generateContent(fullPrompt);
      clearInterval(animationInterval);

      // Get text from response
      responseText = result.response.text();

      stopLoadingIndicator(loadingIndicator);

      log('info', `Completed generating subtasks for task ${task.id}`);

      return parseSubtasksFromText(responseText, nextSubtaskId, numSubtasks, task.id);
    } catch (error) {
      stopLoadingIndicator(loadingIndicator);
      throw error;
    }
  } catch (error) {
    log('error', `Error generating subtasks: ${error.message}`);
    throw error;
  }
}

/**
 * Generate subtasks with research from Perplexity
 * @param {Object} task - Task to generate subtasks for
 * @param {number} numSubtasks - Number of subtasks to generate
 * @param {number} nextSubtaskId - Next subtask ID
 * @param {string} additionalContext - Additional context
 * @param {string} knowledgeBase - Optional business knowledge context
 * @returns {Array} Generated subtasks
 */
async function generateSubtasksWithPerplexity(task, numSubtasks = 3, nextSubtaskId = 1, additionalContext = '', knowledgeBase = null) {
  try {
    // First, perform research to get context
    log('info', `Researching context for task ${task.id}: ${task.title}`);
    const perplexityClient = getPerplexityClient();

    const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || 'sonar-pro';
    const researchLoadingIndicator = startLoadingIndicator('Researching best practices with Perplexity AI...');

    // Include business knowledge in research query if available
    let businessKnowledgeSection = '';
    if (knowledgeBase) {
      businessKnowledgeSection = `
BUSINESS KNOWLEDGE CONTEXT:
The task should be implemented in accordance with the following business knowledge and domain-specific information:
${knowledgeBase}
`;
    }

    // Formulate research query based on task
    const researchQuery = `I need to implement "${task.title}" which involves: "${task.description}".
What are current best practices, libraries, design patterns, and implementation approaches?
Include concrete code examples and technical considerations where relevant.${businessKnowledgeSection}`;

    // Query Perplexity for research
    const researchResponse = await perplexityClient.chat.completions.create({
      model: PERPLEXITY_MODEL,
      messages: [{
        role: 'user',
        content: researchQuery
      }],
      temperature: 0.1 // Lower temperature for more factual responses
    });

    const researchResult = researchResponse.choices[0].message.content;

    stopLoadingIndicator(researchLoadingIndicator);
    log('info', 'Research completed, now generating subtasks with additional context');

    // Use the research result as additional context for Gemini to generate subtasks
    const combinedContext = `
RESEARCH FINDINGS:
${researchResult}

ADDITIONAL CONTEXT PROVIDED BY USER:
${additionalContext || "No additional context provided."}
${knowledgeBase ? `
BUSINESS KNOWLEDGE CONTEXT:
${knowledgeBase}
` : ''}
`;

    // Now generate subtasks with Gemini
    const loadingIndicator = startLoadingIndicator(`Generating research-backed subtasks for task ${task.id}...`);
    let responseText = '';

    const systemPrompt = `You are an AI assistant helping with task breakdown for software development.
You need to break down a high-level task into ${numSubtasks} specific subtasks that can be implemented one by one.

You have been provided with research on current best practices and implementation approaches.
Use this research to inform and enhance your subtask breakdown.

Subtasks should:
1. Be specific and actionable implementation steps
2. Follow a logical sequence
3. Each handle a distinct part of the parent task
4. Include clear guidance on implementation approach
5. Have appropriate dependency chains between subtasks
6. Collectively cover all aspects of the parent task${knowledgeBase ? `
7. UTILIZE THE PROVIDED BUSINESS KNOWLEDGE as a critical reference for terminology and implementation details
8. Ensure all subtasks align with domain-specific patterns and concepts from the business knowledge` : ''}

For each subtask, provide:
- A clear, specific title
- Detailed implementation steps that incorporate best practices from the research
- Dependencies on previous subtasks
- Testing approach

Each subtask should be implementable in a focused coding session.`;

    // Standard JSON structure without translations
    let jsonStructureExample = `[
  {
    "id": ${nextSubtaskId},
    "title": "First subtask title",
    "description": "Detailed description incorporating research",
    "dependencies": [],
    "details": "Implementation details with best practices"
  },
  ...more subtasks...
]`;

    // JSON structure with Chinese translations if enabled
    if (CONFIG.useChinese) {
      jsonStructureExample = `[
  {
    "id": ${nextSubtaskId},
    "title": "First subtask title",
    "titleTrans": "第一个子任务标题",
    "description": "Detailed description incorporating research",
    "descriptionTrans": "融合了研究结果的详细描述的中文翻译",
    "dependencies": [],
    "details": "Implementation details with best practices",
    "detailsTrans": "包含最佳实践的实现细节的中文翻译",
    "testStrategy": "Verification approach",
    "testStrategyTrans": "验证方法的中文翻译"
  },
  ...more subtasks...
]`;
    }

    const translationInstruction = CONFIG.useChinese ? `
IMPORTANT: For each subtask, also provide Chinese translations for the title, description, details, and test strategy fields.
These translations should be natural and fluent Chinese that accurately conveys the original English content.
Include these translations in the "titleTrans", "descriptionTrans", "detailsTrans", and "testStrategyTrans" fields in the JSON response.` : '';

    const userPrompt = `Please break down this task into ${numSubtasks} specific, well-researched, actionable subtasks:

Task ID: ${task.id}
Title: ${task.title}
Description: ${task.description}
Current details: ${task.details || 'None provided'}

${combinedContext}${translationInstruction}

Return exactly ${numSubtasks} subtasks with the following JSON structure:
${jsonStructureExample}

Note on dependencies: Subtasks can depend on other subtasks with lower IDs. Use an empty array if there are no dependencies.`;

    try {
      // Regular dots animation to show progress
      let dotCount = 0;
      const readline = await import('readline');
      const animationInterval = setInterval(() => {
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`Generating research-backed subtasks for task ${task.id}${'.'.repeat(dotCount)}`);
        dotCount = (dotCount + 1) % 4;
      }, 500);

      // Combine system prompt and user prompt for Gemini
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      // Use non-streaming API call
      const result = await geminiModel.generateContent(fullPrompt);
      clearInterval(animationInterval);

      // Get text from response
      responseText = result.response.text();

      stopLoadingIndicator(loadingIndicator);

      log('info', `Completed generating research-backed subtasks for task ${task.id}`);

      return parseSubtasksFromText(responseText, nextSubtaskId, numSubtasks, task.id);
    } catch (error) {
      stopLoadingIndicator(loadingIndicator);
      throw error;
    }
  } catch (error) {
    log('error', `Error generating research-backed subtasks: ${error.message}`);
    throw error;
  }
}

/**
 * Parse subtasks from Gemini's response text
 * @param {string} text - Response text
 * @param {number} startId - Starting subtask ID
 * @param {number} expectedCount - Expected number of subtasks
 * @param {number} parentTaskId - Parent task ID
 * @returns {Array} Parsed subtasks
 */
function parseSubtasksFromText(text, startId, expectedCount, parentTaskId) {
  try {
    // Locate JSON array in the text
    const jsonStartIndex = text.indexOf('[');
    const jsonEndIndex = text.lastIndexOf(']');

    if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex < jsonStartIndex) {
      throw new Error("Could not locate valid JSON array in the response");
    }

    // Extract and parse the JSON
    const jsonText = text.substring(jsonStartIndex, jsonEndIndex + 1);
    let subtasks = JSON.parse(jsonText);

    // Validate
    if (!Array.isArray(subtasks)) {
      throw new Error("Parsed content is not an array");
    }

    // Log warning if count doesn't match expected
    if (subtasks.length !== expectedCount) {
      log('warn', `Expected ${expectedCount} subtasks, but parsed ${subtasks.length}`);
    }

    // Normalize subtask IDs if they don't match
    subtasks = subtasks.map((subtask, index) => {
      // Assign the correct ID if it doesn't match
      if (subtask.id !== startId + index) {
        log('warn', `Correcting subtask ID from ${subtask.id} to ${startId + index}`);
        subtask.id = startId + index;
      }

      // Convert dependencies to numbers if they are strings
      if (subtask.dependencies && Array.isArray(subtask.dependencies)) {
        subtask.dependencies = subtask.dependencies.map(dep => {
          return typeof dep === 'string' ? parseInt(dep, 10) : dep;
        });
      } else {
        subtask.dependencies = [];
      }

      // Ensure status is 'pending'
      subtask.status = 'pending';

      // Add parentTaskId
      subtask.parentTaskId = parentTaskId;

      // Handle Chinese translation fields
      if (CONFIG.useChinese) {
        // Ensure titleTrans exists if title exists
        if (subtask.title && !subtask.titleTrans) {
          log('warn', `Missing titleTrans for subtask ${subtask.id}, using empty value`);
          subtask.titleTrans = "";
        }

        // Ensure descriptionTrans exists if description exists
        if (subtask.description && !subtask.descriptionTrans) {
          log('warn', `Missing descriptionTrans for subtask ${subtask.id}, using empty value`);
          subtask.descriptionTrans = "";
        }

        // Ensure detailsTrans exists if details exists
        if (subtask.details && !subtask.detailsTrans) {
          log('warn', `Missing detailsTrans for subtask ${subtask.id}, using empty value`);
          subtask.detailsTrans = "";
        }

        // Ensure testStrategyTrans exists if testStrategy exists
        if (subtask.testStrategy && !subtask.testStrategyTrans) {
          log('warn', `Missing testStrategyTrans for subtask ${subtask.id}, using empty value`);
          subtask.testStrategyTrans = "";
        }
      }

      return subtask;
    });

    return subtasks;
  } catch (error) {
    log('error', `Error parsing subtasks: ${error.message}`);

    // Create a fallback array of empty subtasks if parsing fails
    log('warn', 'Creating fallback subtasks');

    const fallbackSubtasks = [];

    for (let i = 0; i < expectedCount; i++) {
      const fallbackSubtask = {
        id: startId + i,
        title: `Subtask ${startId + i}`,
        description: "Auto-generated fallback subtask",
        dependencies: [],
        details: "This is a fallback subtask created because parsing failed. Please update with real details.",
        status: 'pending',
        parentTaskId: parentTaskId
      };

      // Add Chinese translation fields if enabled
      if (CONFIG.useChinese) {
        fallbackSubtask.titleTrans = "自动生成的子任务";
        fallbackSubtask.descriptionTrans = "自动生成的后备子任务";
        fallbackSubtask.detailsTrans = "这是因为解析失败而创建的后备子任务。请使用真实细节进行更新。";
        fallbackSubtask.testStrategyTrans = "";
      }

      fallbackSubtasks.push(fallbackSubtask);
    }

    return fallbackSubtasks;
  }
}

/**
 * Generate a prompt for complexity analysis
 * @param {Object} tasksData - Tasks data object containing tasks array
 * @returns {string} Generated prompt
 */
function generateComplexityAnalysisPrompt(tasksData) {
  return `Analyze the complexity of the following tasks and provide recommendations for subtask breakdown:

${tasksData.tasks.map(task => `
Task ID: ${task.id}
Title: ${task.title}
Description: ${task.description}
Details: ${task.details}
Dependencies: ${JSON.stringify(task.dependencies || [])}
Priority: ${task.priority || 'medium'}
`).join('\n---\n')}

Analyze each task and return a JSON array with the following structure for each task:
[
  {
    "taskId": number,
    "taskTitle": string,
    "complexityScore": number (1-10),
    "recommendedSubtasks": number (${Math.max(3, CONFIG.defaultSubtasks - 1)}-${Math.min(8, CONFIG.defaultSubtasks + 2)}),
    "expansionPrompt": string (a specific prompt for generating good subtasks),
    "reasoning": string (brief explanation of your assessment)
  },
  ...
]

IMPORTANT: Make sure to include an analysis for EVERY task listed above, with the correct taskId matching each task's ID.
`;
}

// Export AI service functions
export {
  getPerplexityClient,
  callGemini,
  handleRequest,
  processClaudeResponse,
  generateSubtasks,
  generateSubtasksWithPerplexity,
  parseSubtasksFromText,
  generateComplexityAnalysisPrompt,
  handleGeminiError,
  geminiModel
};