import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

const DATA_DIR = join(process.cwd(), "data")
const TASKS_FILE = join(DATA_DIR, "tasks.json")
const USERS_FILE = join(DATA_DIR, "users.json")
const GOALS_FILE = join(DATA_DIR, "goals.json")

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  require("fs").mkdirSync(DATA_DIR, { recursive: true })
}

function readTasks() {
  if (!existsSync(TASKS_FILE)) {
    return []
  }
  try {
    const data = readFileSync(TASKS_FILE, "utf8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

function writeTasks(tasks: any[]) {
  writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2))
}

function readUsers() {
  if (!existsSync(USERS_FILE)) {
    return []
  }
  try {
    const data = readFileSync(USERS_FILE, "utf8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

function readGoals() {
  if (!existsSync(GOALS_FILE)) {
    return []
  }
  try {
    const data = readFileSync(GOALS_FILE, "utf8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

function getNextTaskId() {
  const tasks = readTasks()
  return tasks.length > 0 ? Math.max(...tasks.map((t: any) => t.id)) + 1 : 1
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value
  if (!token) return null

  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch {
    return null
  }
}

// Fallback task suggestions when Grok API is not available
const generateFallbackTasks = (goalTitle: string, goalDescription: string) => {
  // Generic positive tasks
  const positiveTasks = [
    { description: `Work on ${goalTitle} for 30 minutes`, points: 25, type: "positive" },
    { description: `Research strategies for ${goalTitle}`, points: 15, type: "positive" },
    { description: `Plan next steps for ${goalTitle}`, points: 20, type: "positive" },
    { description: `Practice skills related to ${goalTitle}`, points: 30, type: "positive" },
    { description: `Track progress on ${goalTitle}`, points: 10, type: "positive" },
  ]

  // Generic negative tasks
  const negativeTasks = [
    { description: `Procrastinate on ${goalTitle}`, points: -15, type: "negative" },
    { description: `Skip planned work on ${goalTitle}`, points: -20, type: "negative" },
    { description: `Get distracted from ${goalTitle}`, points: -10, type: "negative" },
    { description: `Make excuses about ${goalTitle}`, points: -25, type: "negative" },
  ]

  return [...positiveTasks.slice(0, 3), ...negativeTasks.slice(0, 2)]
}

export async function POST(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { goalId, goalTitle, goalDescription } = await request.json()

    // Get goal details to check deadline
    const goals = readGoals()
    const goal = goals.find((g: any) => g.id === goalId && g.userId === user.userId)
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    // Check if tasks already exist for this goal (excluding templates)
    const existingTasks = readTasks()
    const goalHasNonTemplateTasks = existingTasks.some((t: any) => t.goalId === goalId && !t.isTemplate)

    if (goalHasNonTemplateTasks) {
      return NextResponse.json(
        {
          error: "Daily tasks already exist for this goal. Use regenerate to create new ones.",
        },
        { status: 400 },
      )
    }

    // Also clean up any existing template tasks for this goal before creating new ones
    const cleanedTasks = existingTasks.filter((t: any) => !(t.goalId === goalId && t.isTemplate === true))

    // Get user's Grok API key
    const users = readUsers()
    const userData = users.find((u: any) => u.id === user.userId)
    const grokApiId = userData?.grokApiId

    let taskTemplates = []

    if (grokApiId) {
      try {
        // Try to use Grok API for task generation
        const grokResponse = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${grokApiId}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content:
                  "You are a goal achievement assistant. Generate 5 specific, actionable DAILY tasks (3 positive, 2 negative) for the given goal. These tasks should be things someone can do every day to work towards their goal. Return only a JSON array with objects containing: description, type (positive/negative), and points (10-50 for positive, -10 to -30 for negative). Make tasks daily habits, not one-time actions.",
              },
              {
                role: "user",
                content: `Goal: ${goalTitle}\nDescription: ${goalDescription}\n\nGenerate daily recurring tasks that will help achieve this goal. These should be daily habits or actions.`,
              },
            ],
            model: "grok-beta",
            max_tokens: 500,
          }),
        })

        if (grokResponse.ok) {
          const grokData = await grokResponse.json()
          const content = grokData.choices[0]?.message?.content

          try {
            const aiTasks = JSON.parse(content)
            if (Array.isArray(aiTasks)) {
              taskTemplates = aiTasks
            }
          } catch (parseError) {
            console.error("Failed to parse Grok response:", parseError)
          }
        }
      } catch (grokError) {
        console.error("Grok API error:", grokError)
      }
    }

    // Use fallback tasks if Grok API failed or no API key
    if (taskTemplates.length === 0) {
      taskTemplates = generateFallbackTasks(goalTitle, goalDescription)
    }

    // Create temporary task templates for today only (for review)
    const today = new Date().toISOString().split("T")[0]
    const tasks = cleanedTasks // Use cleaned tasks here
    let nextTaskId = getNextTaskId()

    // Save only today's tasks for review - NOT the full daily instances yet
    const todaysTasks = taskTemplates.map((task: any) => ({
      id: nextTaskId++,
      goalId,
      type: task.type,
      description: task.description,
      points: task.points,
      completed: false,
      date: today,
      isTemplate: true, // Mark as template for review
      createdAt: new Date().toISOString(),
    }))

    tasks.push(...todaysTasks)
    writeTasks(tasks)

    return NextResponse.json({
      message: "Task templates generated for review",
      tasks: todaysTasks,
      source: grokApiId ? "ai" : "fallback",
    })
  } catch (error) {
    console.error("Task generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
