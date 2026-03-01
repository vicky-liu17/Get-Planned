// utils/taskUtils.ts
export const getCategoryClass = (category: string) => {
  switch (category) {
    case "work":          return "task-work";
    case "study":         return "task-study";
    case "entertainment": return "task-ent";
    case "health":        return "task-health";
    case "life":          return "task-life";
    default:              return "task-other";
  }
};

export const LEGEND = [
  { key: "work",          label: "Work",   color: "#38BDF8" },
  { key: "study",         label: "Study",  color: "#A78BFA" },
  { key: "health",        label: "Health", color: "#34D399" },
  { key: "entertainment", label: "Fun",    color: "#F472B6" },
  { key: "life",          label: "Life",   color: "#FB923C" },
  { key: "other",         label: "Other",  color: "#CA8A04"},
];