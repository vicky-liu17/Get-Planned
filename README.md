# GetPlanned

**GetPlanned** is an AI-native scheduling ecosystem designed to bridge the gap between human intent and machine execution. By leveraging Large Language Models (LLMs) and a custom-built spatial interaction engine, it transforms natural language commands into smart, conflict-free daily schedules.

For a detailed technical deep-dive into the research background, HCI (Human-Computer Interaction) optimizations, and core architecture, please visit the project portfolio:
👉 **[View Full Project Details & Research Case Study](https://vicky-liu17.github.io/)** *(Select **Project 3: Get Planned**)*.

---

## 🚀 Key Features

* **Semantic Reasoning Engine**: Utilizes LLMs to parse vague natural language (e.g., *"next Monday evening"*) into deterministic, structured calendar events.
* **Server-side Calibration**: Eliminates AI "arithmetic hallucinations" by calculating physical timelines on the backend, ensuring 100% schedule reliability and conflict-free slotting.
* **High-Fidelity Interaction (Deadzone Algorithm)**: Implements a custom "Slop/Deadzone" algorithm to filter out physiological micro-movements during long-presses, enabling a 60fps "physically intuitive" drag-and-drop experience.
* **Multimodal Feedback**: Features automated semantic icon matching (e.g., mapping "Gym" to a dumbbell icon), categorical color coding, and synchronized audio-visual cues for a polished "Tactile" feel.
* **HAI-Centered Design**: Displays AI reasoning through a typewriter component to establish algorithmic transparency—adhering to the principle of *"AI Proposes, Human Decides."*

---

## 🛠️ Local Installation

This project is built with [Next.js](https://nextjs.org) and bootstrapped with `create-next-app`.

### 1. Prerequisites: API Key Setup

This project requires a Large Language Model (LLM) API key (e.g., OpenAI, DeepSeek, or equivalent) to function.

1. Create a `.env.local` file in the root directory of the project.
2. Add your API key using the environment variable name **`LLM_API_KEY`**:

```env
LLM_API_KEY=your_actual_api_key_here

```

> **Note**: For security, ensure your `.env.local` file is included in your `.gitignore` and is never committed to version control.

### 2. Run the Development Server

Install the dependencies and start the local environment:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# or
yarn dev
# or
pnpm dev

```

Open **http://localhost:3000** in your browser to view the application.

---

## 🌐 Deployment & Demo

The easiest way to deploy this app is via the **Vercel Platform**.

* **Live Demo**: [https://get-planned.vercel.app/](https://get-planned.vercel.app/)
* **Network Notice**: For users in **Mainland China**, access to the Vercel-hosted demo may be restricted due to regional network configurations. If the link is inaccessible, a local deployment is recommended.