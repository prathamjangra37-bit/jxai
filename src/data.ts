import { Suggestion, DeveloperNote } from "./types";

export const SUGGESTIONS: Suggestion[] = [
  {
    id: "joke",
    title: "Haryanvi Humour",
    text: "Tell me a classic, funny Haryanvi joke or story in Haryanvi style that will make me laugh!",
    icon: "Laugh"
  },
  {
    id: "business",
    title: "Start a Business",
    text: "I want to start a new small business. Please guide me with a step-by-step business plan.",
    icon: "Briefcase"
  },
  {
    id: "farming",
    title: "Organic Farming Tips",
    text: "Give me some traditional organic farming and soil health improvement advice in simple steps.",
    icon: "Sprout"
  },
  {
    id: "culture",
    title: "Haryanvi Cuisine",
    text: "What are some of the most famous traditional foods of Haryana and what are their health benefits?",
    icon: "Utensils"
  }
];

export const PRINCIPLES: DeveloperNote[] = [
  {
    title: "Deis Tone & Dialect",
    description: "JX AI communicates with a sweet blend of Haryanvi and Hindi, reflecting respect, local warmth, and a friendly 'Ram Ram' culture."
  },
  {
    title: "Step-by-Step Guidance",
    description: "If you want to learn something, JX AI guides you slowly and thoroughly with simple words and practical examples."
  },
  {
    title: "Absolute Honesty",
    description: "If JX AI does not know the answer to a question, it will be honest and say so instead of giving incorrect or made-up information."
  }
];
