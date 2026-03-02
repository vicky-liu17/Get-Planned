# GetPlanned

**GetPlanned** is an AI-native scheduling ecosystem designed to bridge the gap between human intent and machine execution. By leveraging Large Language Models (LLMs) and a custom-built spatial interaction engine, it transforms natural language commands into smart, conflict-free daily schedules.

For a detailed explanation of the project's research background, HCI optimizations (such as the Deadzone Algorithm), and core technical architecture, please visit the official project page:
**[View Project Details & Research](https://vicky-liu17.github.io/projects/3)**.

---

## 🚀 Key Features

* **Semantic Reasoning Engine**: Uses LLMs to parse vague natural language (e.g., "next Monday evening") into deterministic calendar events.
* **Server-side Calibration**: Eliminates AI "arithmetic hallucinations" by calculating physical timelines on the backend to ensure 100% schedule reliability.
* **High-Fidelity Interaction**: Features a "Deadzone Algorithm" to handle micro-movements during long-press and 60fps drag-and-drop rescheduling.
* **Multimodal Feedback**: Includes automated semantic icon matching, categorical color coding, and synchronized audio-visual feedback.

---

## 🛠️ Local Installation

This project is built with [Next.js](https://nextjs.org) and bootstrapped with `create-next-app`.

### 1. Prerequisites: API Key Setup

This project requires a Large Language Model (LLM) API key to function.

1. Create a `.env.local` file in the root directory of the project.
2. Add your API key using the specific name **`LLM_API_KEY`**:
```env
LLM_API_KEY=your_actual_api_key_here

```


*(Note: Ensure you do not commit your `.env.local` file to version control for security.)*

### 2. Run the Development Server

Install the dependencies and start the local server:

```bash
npm install
# then
npm run dev
# or
yarn dev
# or
pnpm dev

```

Open **[http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)** in your browser to see the result.

---

## 🌐 Deployment

The easiest way to deploy this app is via the **Vercel Platform**.

**Note for users in Mainland China**: Access to the live demo hosted on Vercel may be restricted due to regional network configurations.