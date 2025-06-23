import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { sql } from "@/lib/db"

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
  const positiveTasks = [
    { description: `Work on ${goalTitle} for 30 minutes`, points: 25, type: "positive" },
    { description: `Research strategies for ${goalTitle}`, points: 15, type: "positive" },
    { description: `Plan next steps for ${goalTitle}`, points: 20, type: "positive" },
    { description: `Practice skills related to ${goalTitle}`, points: 30, type: "positive" },
    { description: `Track progress on ${goalTitle}`, points: 10, type: "positive" },
  ]

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

    // Verify goal belongs to user
    const goalCheck = await sql`
      SELECT id FROM goals WHERE id = ${goalId} AND user_id = ${user.userId}
    `

    if (goalCheck.length === 0) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    // Check if non-template tasks already exist for this goal
    const existingTasks = await sql`
      SELECT id FROM tasks WHERE goal_id = ${goalId} AND is_template = false
    `

    if (existingTasks.length > 0) {
      return NextResponse.json(
        {
          error: "Daily tasks already exist for this goal. Use regenerate to create new ones.",
        },
        { status: 400 },
      )
    }

    // Clean up any existing template tasks for this goal
    await sql`
      DELETE FROM tasks WHERE goal_id = ${goalId} AND is_template = true
    `

    // Get user's Grok API key
    const userData = await sql`
      SELECT grok_api_id FROM users WHERE id = ${user.userId}
    `

    const grokApiId = userData[0]?.grok_api_id

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

    // Create template tasks for today only (for review)
    const today = new Date().toISOString().split("T")[0]
    const createdTasks = []

    for (const task of taskTemplates) {
      const newTask = await sql`
        INSERT INTO tasks (goal_id, type, description, points, completed, date, is_template)
        VALUES (${goalId}, ${task.type}, ${task.description}, ${task.points}, false, ${today}, true)
        RETURNING id, goal_id, type, description, points, completed, date, is_template, created_at
      `

      const createdTask = newTask[0]
      createdTasks.push({
        id: createdTask.id,
        goalId: createdTask.goal_id,
        type: createdTask.type,
        description: createdTask.description,
        points: createdTask.points,
        completed: createdTask.completed,
        date: createdTask.date,
        isTemplate: createdTask.is_template,
        createdAt: createdTask.created_at,
      })
    }

    return NextResponse.json({
      message: "Task templates generated for review",
      tasks: createdTasks,
      source: grokApiId ? "ai" : "fallback",
    })
  } catch (error) {
    console.error("Task generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
