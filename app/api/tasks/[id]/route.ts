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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const taskId = Number.parseInt(params.id)
    const { completed } = await request.json()

    const updatedTask = await sql`
      UPDATE tasks 
      SET completed = ${completed}, updated_at = CURRENT_TIMESTAMP
      FROM goals
      WHERE tasks.id = ${taskId} 
        AND tasks.goal_id = goals.id 
        AND goals.user_id = ${user.userId}
      RETURNING tasks.id, tasks.goal_id, tasks.type, tasks.description, tasks.points, tasks.completed, tasks.date, tasks.is_template
    `

    if (updatedTask.length === 0) {
      return NextResponse.json({ error: "Task not found or unauthorized" }, { status: 404 })
    }

    const task = updatedTask[0]

    return NextResponse.json({
      id: task.id,
      goalId: task.goal_id,
      type: task.type,
      description: task.description,
      points: task.points,
      completed: task.completed,
      date: task.date,
      isTemplate: task.is_template,
    })
  } catch (error) {
    console.error("Task update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const taskId = Number.parseInt(params.id)
    const { goalId, type, description, points, date, completed, isTemplate } = await request.json()

    if (!goalId || !type || !description || points === undefined || !date) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Verify both old and new goals belong to user
    const goalCheck = await sql`
      SELECT id FROM goals WHERE id = ${goalId} AND user_id = ${user.userId}
    `

    if (goalCheck.length === 0) {
      return NextResponse.json({ error: "Goal not found or unauthorized" }, { status: 404 })
    }

    const updatedTask = await sql`
      UPDATE tasks 
      SET goal_id = ${goalId}, type = ${type}, description = ${description}, 
          points = ${points}, date = ${date}, completed = ${completed}, 
          is_template = ${isTemplate || false}, updated_at = CURRENT_TIMESTAMP
      FROM goals
      WHERE tasks.id = ${taskId} 
        AND tasks.goal_id = goals.id 
        AND goals.user_id = ${user.userId}
      RETURNING tasks.id, tasks.goal_id, tasks.type, tasks.description, tasks.points, tasks.completed, tasks.date, tasks.is_template
    `

    if (updatedTask.length === 0) {
      return NextResponse.json({ error: "Task not found or unauthorized" }, { status: 404 })
    }

    const task = updatedTask[0]

    return NextResponse.json({
      id: task.id,
      goalId: task.goal_id,
      type: task.type,
      description: task.description,
      points: task.points,
      completed: task.completed,
      date: task.date,
      isTemplate: task.is_template,
    })
  } catch (error) {
    console.error("Task update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const taskId = Number.parseInt(params.id)

    const deletedTask = await sql`
      DELETE FROM tasks 
      USING goals
      WHERE tasks.id = ${taskId} 
        AND tasks.goal_id = goals.id 
        AND goals.user_id = ${user.userId}
      RETURNING tasks.id
    `

    if (deletedTask.length === 0) {
      return NextResponse.json({ error: "Task not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json({ message: "Task deleted successfully" })
  } catch (error) {
    console.error("Task deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
