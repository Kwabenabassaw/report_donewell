import { getSession } from "@/lib/auth/session"
import { ScopeGuard } from "@/lib/auth/scope-guard"
import { BulkPrintService } from "@/server/services/BulkPrintService"


export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized. Please log in." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const isAdmin = ScopeGuard.isAdministrative({
      userId: session.userId,
      roles: session.roles,
    })
    const isTeacher =
      session.roles.includes("CLASS_TEACHER") || session.roles.includes("SUBJECT_TEACHER")

    if (!isAdmin && !isTeacher) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Administrative or teaching role required." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const { searchParams } = new URL(req.url)
    const termId = searchParams.get("termId")
    const classId = searchParams.get("classId")

    if (!termId || !classId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: termId and classId are required." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const result = await BulkPrintService.generateBulkPrintZip(termId, classId, session.userId)

    return new Response(result.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": result.buffer.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    })
  } catch (err: unknown) {
    console.error("Bulk print ZIP generation error:", err)
    const message = err instanceof Error ? err.message : "Failed to generate bulk print package."
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
