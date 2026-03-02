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

        // [Core Failsafe 2] Feed existing task properties to the AI, and pre-calculate exact end times to prevent math hallucination
        const contextTasks = (tasks || []).map((t: any) => {
            let endTimeStr = "";
            if (t.exactTime && t.duration) {
                const [h, m] = t.exactTime.split(':').map(Number);
                const totalMins = h * 60 + m + t.duration;
                const endH = Math.floor(totalMins / 60) % 24;
                const endM = totalMins % 60;
                endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
            }

            return {
                id: t.id,
                name: t.taskName,
                date: t.suggestedDate,
                endDate: t.endDate || "",
                timeBucket: t.timeBucket,
                category: t.category,       
                exactTime: t.exactTime,
                duration: t.duration,
                calculatedEndTime: endTimeStr, // 🌟 新增：由前端/NodeJS算好的精确结束时间，免去 AI 自己做加法
                location: t.location,       
                recurrence: t.recurrence,
                deletedDates: t.deletedDates || []
            };
        });

        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.LLM_API_KEY}`
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

Current Tasks Schedule (WITH EXACT END TIMES):
${JSON.stringify(contextTasks)}

Rules:
1. DATE DEFAULT & SMART SPILLOVER: If no date is specified, DEFAULT TO TODAY. If Today is crowded, intelligently spill over flexible tasks to TOMORROW.
2. STRICT TIME TRAVEL BAN: Convert "exactTime" to 24-hour HH:MM. If "suggestedDate" is TODAY and "exactTime" < "${currentTime}", REJECT IT. EXCEPTION: If current time > 20:00 and user inputs "0:00" or "midnight", set "suggestedDate" to Tomorrow.
3. EXACT TIME & BUCKET MAPPING: "timeBucket" MUST strictly logically match "exactTime". 
   - 00:00 to 11:59 = "morning"
   - 12:00 to 17:59 = "afternoon"
   - 18:00 to 23:59 = "evening"
4. ABSOLUTE CHRONOLOGICAL ORDER: If tasks are linked by sequences like "then" (e.g., Task A, then Task B), Task A MUST be scheduled BEFORE or at the SAME TIME as Task B.
5. MULTI-DAY LOAD BALANCING: For independent tasks without "then", distribute them to less crowded buckets AND less crowded days.
6. CREATE: return action="CREATE", fill "taskDetails".
7. UPDATE: return action="UPDATE", set "targetTaskId", provide FULL updated "taskDetails" (preserve category/exactTime/location).
8. DELETE: return action="DELETE", set "targetTaskId".
9. REASONING: Provide a friendly, human-like explanation of your schedule. 
   - DO NOT mention internal technical details like "Icon is appropriate", "CalculatedEndTime", or "JSON".
   - DO NOT repeat the date in YYYY-MM-DD format unless necessary; use "next Monday", "tomorrow", or "this evening".
   - FOCUS on the "Why": e.g., "I've tucked your TV time into next Monday evening so it doesn't clash with your movie plans."
   - Keep it concise (2-3 sentences).
   - End it with: "(Tip: You can drag and drop cards to adjust the calendar!)".
10. DURATION & ESTIMATION: EVERY task MUST have a "duration" (in minutes). If explicitly stated, set "duration" and "isEstimatedDuration": false. If NOT stated, logically estimate it and set "isEstimatedDuration": true.
11. PRECISE CONFLICT DETECTION: NEVER overlap tasks. If a conflict occurs, shift the new task forward.
12. ICON SELECTION (NEW): Choose the MOST appropriate icon from this EXACT list: 
["BookOpen" (reading), "PenTool" (writing), "Briefcase" (work), "Monitor" (computer), "GraduationCap" (study), "Calculator" (finance/math), "FileText" (document), "Presentation" (meeting), "Code" (programming), "Dumbbell" (gym), "Heart" (care/health), "Activity" (sports), "Pill" (medicine), "Apple" (diet), "Droplet" (water/cleaning), "Coffee" (break), "Utensils" (eating/cooking), "Bed" (sleep), "ShoppingCart" (shopping), "Home" (housework), "Sun" (outdoors), "Moon" (night), "Bath" (shower), "Shirt" (laundry), "Wrench" (repair), "Users" (social), "Phone" (calling), "Mail" (email), "MessageCircle" (chat), "Video" (video call), "Plane" (flight), "Car" (driving), "Bus" (transit), "Map" (navigation), "Music" (audio/music), "Tv" (watching tv/movie), "Gamepad2" (gaming), "Camera" (photo), "Ticket" (cinema/event), "Palette" (art), "Star" (important), "Circle" (other/fallback)]. MUST use "Circle" if unsure.

Return ONLY a valid JSON object matching this EXACT schema:
{
  "reasoning": "string",
  "operations": [
    {
      "action": "CREATE" | "UPDATE" | "DELETE" | "MODIFY_INSTANCE" | "ERROR",
      "targetTaskId": "string (empty if CREATE or ERROR)",
      "targetDate": "YYYY-MM-DD",
      "taskDetails": {
        "taskName": "string",
        "suggestedDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD" | "",
        "timeBucket": "morning" | "afternoon" | "evening" | "any",
        "category": "work" | "study" | "health" | "life" | "entertainment" | "other",
        "exactTime": "HH:MM" | "",
        "location": "string" | "",
        "recurrence": "none" | "daily" | "weekdays" | "weekends" | "weekly" | "monthly",
        "deletedDates": ["YYYY-MM-DD"],
        "duration": "number",
        "isEstimatedDuration": "boolean",
        "icon": "string (from the allowed list)"
      },
      "errorMessage": "string"
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