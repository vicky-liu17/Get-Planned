// app/api/scaffold/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        // Receive command, current date, current time, and existing tasks from the frontend
        const { command, currentDate, currentTime, tasks } = await req.json();

        if (!command) {
            return NextResponse.json({ error: "Command is required" }, { status: 400 });
        }

        // [Core Failsafe 1] Generate a 7-day future calendar reference to prevent AI from miscalculating dates across months
        const [cYear, cMonth, cDay] = currentDate.split('-').map(Number);
        const dateRef = [];
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for(let i=0; i<=7; i++) {
            const tempD = new Date(cYear, cMonth - 1, cDay + i);
            const y = tempD.getFullYear();
            const m = String(tempD.getMonth() + 1).padStart(2, "0");
            const dNum = String(tempD.getDate()).padStart(2, "0");
            let label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : i === 2 ? "Day after tomorrow" : `+${i} days`;
            dateRef.push(`- ${label}: ${y}-${m}-${dNum} (${weekdays[tempD.getDay()]})`);
        }

        // [Core Failsafe 2] Feed existing task properties to the AI to prevent loss of colors and attributes during updates
        const contextTasks = (tasks || []).map((t: any) => ({
            id: t.id,
            name: t.taskName,
            date: t.suggestedDate,
            endDate: t.endDate || "",
            timeBucket: t.timeBucket,
            category: t.category,       
            exactTime: t.exactTime,     
            location: t.location,       
            recurrence: t.recurrence,
            deletedDates: t.deletedDates || []
        }));

        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: `You are a smart scheduling assistant. 
Today's date is ${currentDate}.
Current local time is ${currentTime || "Unknown"} (24-hour format).

CRITICAL CALENDAR REFERENCE:
${dateRef.join('\n')}

Current Tasks Schedule:
${JSON.stringify(contextTasks)}

Rules:
1. DATE DEFAULT & SMART SPILLOVER (CRITICAL): If the user does not specify a date, your first choice is TODAY. HOWEVER, check the "Current Tasks Schedule". If TODAY is crowded (e.g., 2+ tasks in a bucket), you MUST spill over flexible tasks to TOMORROW. If TOMORROW is also crowded, intelligently push tasks to the DAY AFTER TOMORROW. Your goal is a healthy, balanced schedule across the next 3-4 days.
2. STRICT TIME TRAVEL BAN: Convert "exactTime" to 24-hour HH:MM. If "suggestedDate" is TODAY and "exactTime" < "${currentTime}", REJECT IT. EXCEPTION: If current time > 20:00 and user inputs "0:00" or "midnight", set "suggestedDate" to Tomorrow.
3. EXACT TIME & BUCKET MAPPING: "timeBucket" MUST strictly logically match "exactTime". 
   - 00:00 to 11:59 = "morning"
   - 12:00 to 17:59 = "afternoon"
   - 18:00 to 23:59 = "evening"
4. ABSOLUTE CHRONOLOGICAL ORDER: If tasks are linked by sequences like "then" (e.g., Task A, then Task B), Task A MUST be scheduled BEFORE or at the SAME TIME as Task B. Sequence strictly overrules load balancing.
5. MULTI-DAY LOAD BALANCING: For independent tasks without "then", distribute them to less crowded buckets AND less crowded days. Do not cram 4-5 tasks into one day if the next day is completely empty.
6. CREATE: return action="CREATE", fill "taskDetails".
7. UPDATE: return action="UPDATE", set "targetTaskId", provide FULL updated "taskDetails" (preserve category/exactTime/location).
8. DELETE: return action="DELETE", set "targetTaskId".
9. REASONING: Provide a short, friendly explanation of your arrangement logic in the "reasoning" field. Explain your priorities, and explicitly mention if you pushed a task to tomorrow or the day after tomorrow to balance their workload. End it with: "(Tip: You can drag and drop cards to adjust the calendar!)".

Return ONLY a valid JSON object matching this EXACT schema:
{
  "reasoning": "string (Your explanation of the schedule)",
  "operations": [
    {
      "action": "CREATE" | "UPDATE" | "DELETE" | "MODIFY_INSTANCE" | "ERROR",
      "targetTaskId": "string (empty if CREATE or ERROR)",
      "targetDate": "YYYY-MM-DD (only if action is MODIFY_INSTANCE)",
      "taskDetails": {
        "taskName": "string",
        "suggestedDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD" | "",
        "timeBucket": "morning" | "afternoon" | "evening" | "any",
        "category": "work" | "study" | "health" | "life" | "entertainment" | "other",
        "exactTime": "HH:MM" | "",
        "location": "string" | "",
        "recurrence": "none" | "daily" | "weekdays" | "weekends" | "weekly" | "monthly",
        "deletedDates": ["YYYY-MM-DD"]
      },
      "errorMessage": "string (only if action is ERROR)"
    }
  ]
}`
                    },
                    { role: "user", content: command }
                ]
            })
        });

        if (!response.ok) return NextResponse.json({ error: "API call failed" }, { status: response.status });

        const data = await response.json();
        let content = data.choices[0].message.content.trim();
        content = content.replace(/```json/g, '').replace(/```/g, '').replace(/^['"]|['"]$/g, '').trim();

        try {
            const steps = JSON.parse(content);
            return NextResponse.json(steps);
        } catch (parseError) {
            return NextResponse.json({ error: "Format error", raw: content }, { status: 500 });
        }

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}