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
    const result = await sql`
      SELECT COALESCE(SUM(t.points), 0) as total_points
      FROM tasks t
      INNER JOIN goals g ON t.goal_id = g.id
      WHERE g.user_id = ${user.userId} AND t.completed = true
    `

    return NextResponse.json({ total: Number(result[0].total_points) })
  } catch (error) {
    console.error("Points calculation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
