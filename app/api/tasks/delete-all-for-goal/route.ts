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

export async function DELETE(request: NextRequest) {
  const user = getUserFromToken(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { goalId } = await request.json()

    // Verify goal belongs to user and delete all tasks
    const deletedTasks = await sql`
      DELETE FROM tasks 
      USING goals
      WHERE tasks.goal_id = ${goalId} 
        AND tasks.goal_id = goals.id 
        AND goals.user_id = ${user.userId}
      RETURNING tasks.id
    `

    return NextResponse.json({
      message: "All tasks for goal deleted successfully",
      deletedCount: deletedTasks.length,
    })
  } catch (error) {
    console.error("Task deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
