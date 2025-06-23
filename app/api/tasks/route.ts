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

export async function GET(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const tasks = await sql`
      SELECT 
        t.id, 
        t.goal_id, 
        t.type, 
        t.description, 
        t.points, 
        t.completed, 
        t.date::text as date,
        t.is_template, 
        t.created_at::text as created_at
      FROM tasks t
      INNER JOIN goals g ON t.goal_id = g.id
      WHERE g.user_id = ${user.userId}
      ORDER BY t.date DESC, t.created_at DESC
    `

    return NextResponse.json(
      tasks.map((task) => ({
        id: task.id,
        goalId: task.goal_id,
        type: task.type,
        description: task.description,
        points: task.points,
        completed: task.completed,
        date: task.date,
        isTemplate: task.is_template,
        createdAt: task.created_at,
      })),
    )
  } catch (error) {
    console.error("Tasks fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { goalId, type, description, points, date, completed, isTemplate } = await request.json()

    if (!goalId || !type || !description || points === undefined || !date) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Verify goal belongs to user
    const goalCheck = await sql`
      SELECT id FROM goals WHERE id = ${goalId} AND user_id = ${user.userId}
    `

    if (goalCheck.length === 0) {
      return NextResponse.json({ error: "Goal not found or unauthorized" }, { status: 404 })
    }

    const newTask = await sql`
      INSERT INTO tasks (goal_id, type, description, points, completed, date, is_template)
      VALUES (${goalId}, ${type}, ${description}, ${points}, ${completed || false}, ${date}, ${isTemplate || false})
      RETURNING 
        id, 
        goal_id, 
        type, 
        description, 
        points, 
        completed, 
        date::text as date, 
        is_template, 
        created_at::text as created_at
    `

    const task = newTask[0]

    return NextResponse.json({
      id: task.id,
      goalId: task.goal_id,
      type: task.type,
      description: task.description,
      points: task.points,
      completed: task.completed,
      date: task.date,
      isTemplate: task.is_template,
      createdAt: task.created_at,
    })
  } catch (error) {
    console.error("Task creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
