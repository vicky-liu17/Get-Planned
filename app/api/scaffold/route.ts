// app/api/scaffold/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        // 接收前端传来的命令、当天日期、当前具体时间，以及现有的任务列表
        const { command, currentDate, currentTime, tasks } = await req.json();

        if (!command) {
            return NextResponse.json({ error: "Command is required" }, { status: 400 });
        }

        // 【核心防呆1】为 AI 生成一张“未来 7 天日历对照表”，防止它在跨月（如2月底）时算错日期！
        const [cYear, cMonth, cDay] = currentDate.split('-').map(Number);
        const dateRef = [];
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for(let i=0; i<=7; i++) {
            const tempD = new Date(cYear, cMonth - 1, cDay + i);
            const y = tempD.getFullYear();
            const m = String(tempD.getMonth() + 1).padStart(2, "0");
            const dNum = String(tempD.getDate()).padStart(2, "0");
            let label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : i === 2 ? "Day after tomorrow (后面两天/后天)" : `+${i} days`;
            dateRef.push(`- ${label}: ${y}-${m}-${dNum} (${weekdays[tempD.getDay()]})`);
        }

        // 【核心防呆2】把原有任务的 category, exactTime, location 都喂给 AI，防止更新时色彩和属性丢失
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

Current Tasks:
${JSON.stringify(contextTasks)}

Rules:
1. STRICT TIME TRAVEL BAN (HIGHEST PRIORITY): If the user wants to set or change an "exactTime", you MUST convert it to 24-hour HH:MM format. If "suggestedDate" is TODAY (${currentDate}), you MUST compare the new "exactTime" with "${currentTime}". If "exactTime" < "${currentTime}", it is in the past! YOU MUST REJECT IT entirely. Return action="ERROR" with errorMessage: "The time has already passed, please choose a future time!".
2. CREATE: If adding a new task, return action="CREATE", fill "taskDetails". (Check Rule 1 first!)
3. UPDATE: If modifying a task, return action="UPDATE", set "targetTaskId", and provide the FULL updated "taskDetails". (CRITICAL: You MUST preserve category, exactTime, and location unless explicitly changed. FATAL WARNING: If the user changes the time to a past time today, you MUST ABORT and trigger Rule 1 ERROR instead of updating!).
4. DELETE: If completely deleting a task series, return action="DELETE", set "targetTaskId".
5. SKIP A SPECIFIC DATE: If skipping a recurring task on a specific date, return action="UPDATE", set "targetTaskId", and ADD that date to "deletedDates" in "taskDetails".
6. MODIFY A SPECIFIC DATE: If modifying ONLY ONE SPECIFIC DAY of a recurring task, return action="MODIFY_INSTANCE", set "targetTaskId", provide "targetDate" ("YYYY-MM-DD"), and provide modified "taskDetails" (recurrence="none").
7. EXTEND / MULTIPLE DAYS: If user extends an existing task, return action="UPDATE", KEEP "suggestedDate" unchanged, KEEP "recurrence" as "none", but MUST set "endDate" to the EXACT final date using the Calendar Reference above.
8. ERROR: If impossible or missing task, return action="ERROR" and a friendly "errorMessage" in English only.

Return ONLY a valid JSON object matching this schema:
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
            return NextResponse.json({ steps });
        } catch (parseError) {
            return NextResponse.json({ error: "Format error", raw: content }, { status: 500 });
        }

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}