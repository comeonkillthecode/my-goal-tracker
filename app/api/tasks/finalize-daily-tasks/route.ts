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

export async function POST(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { goalId } = await request.json()

    // Get goal details and verify ownership
    const goalData = await sql`
      SELECT target_date FROM goals WHERE id = ${goalId} AND user_id = ${user.userId}
    `

    if (goalData.length === 0) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const goal = goalData[0]

    // Get template tasks for this goal
    const templateTasks = await sql`
      SELECT type, description, points FROM tasks 
      WHERE goal_id = ${goalId} AND is_template = true
    `

    if (templateTasks.length === 0) {
      return NextResponse.json({ error: "No template tasks found" }, { status: 404 })
    }

    // Delete template tasks
    await sql`
      DELETE FROM tasks WHERE goal_id = ${goalId} AND is_template = true
    `

    // Generate daily task instances from today until goal deadline
    const today = new Date()
    const deadline = new Date(goal.target_date)
    const tasksCreated = []

    for (let date = new Date(today); date <= deadline; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split("T")[0]

      for (const template of templateTasks) {
        const newTask = await sql`
          INSERT INTO tasks (goal_id, type, description, points, completed, date, is_template)
          VALUES (${goalId}, ${template.type}, ${template.description}, ${template.points}, false, ${dateStr}, false)
          RETURNING id
        `
        tasksCreated.push(newTask[0])
      }
    }

    // Calculate statistics
    const daysGenerated = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1

    return NextResponse.json({
      message: "Daily tasks finalized successfully",
      totalTasksGenerated: tasksCreated.length,
      daysGenerated,
      tasksPerDay: templateTasks.length,
    })
  } catch (error) {
    console.error("Task finalization error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
