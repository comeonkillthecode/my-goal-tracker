import { NextResponse } from "next/server"
import { initializeDatabase } from "@/lib/db"

export async function POST() {
  try {
    await initializeDatabase()
    return NextResponse.json({ message: "Database initialized successfully" })
  } catch (error) {
    console.error("Database initialization failed:", error)
    return NextResponse.json({ error: "Database initialization failed" }, { status: 500 })
  }
}
