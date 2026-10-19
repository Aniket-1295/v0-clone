// Starter templates shown on the landing page and in /templates.
// Each one is a real, interactive page under src/templates/components/<slug>.jsx,
// rendered live at /templates/<slug>/preview.

export const TEMPLATE_CATEGORIES = [
  { id: "apps-and-games", label: "Apps and Games" },
  { id: "landing-pages", label: "Landing Pages" },
  { id: "components", label: "Components" },
  { id: "dashboards", label: "Dashboards" },
];

export const TEMPLATES = [
  {
    slug: "saas-landing",
    name: "Lumen SaaS Landing Page",
    category: "landing-pages",
    description: "Hero, feature grid, monthly/yearly pricing toggle and an FAQ accordion.",
    prompt:
      "Build a SaaS landing page for a product called Lumen: a sticky header, a hero with a headline, subtext and two buttons, a three-column feature grid, a pricing section with a monthly/yearly toggle and three tiers, and an FAQ accordion. Clean light design with an indigo accent.",
  },
  {
    slug: "analytics-dashboard",
    name: "Analytics Dashboard",
    category: "dashboards",
    description: "Stat cards, a revenue chart with date ranges and a recent orders table.",
    prompt:
      "Create an analytics dashboard with a sidebar, four stat cards, a revenue line chart drawn with SVG that switches between 7, 30 and 90 day ranges, and a recent orders table with status badges. Dark theme.",
  },
  {
    slug: "memory-game",
    name: "Memory Match Game",
    category: "apps-and-games",
    description: "Flip cards to find pairs, with a move counter, timer and restart.",
    prompt:
      "Build a memory card matching game with a 4x4 grid of cards that flip on click, matched pairs stay revealed, a move counter, a timer, a best score saved in local state and a restart button. Playful colorful design.",
    mobile: true,
  },
  {
    slug: "pricing-table",
    name: "Pricing Table",
    category: "components",
    description: "Three plans, billing toggle with savings badge and a highlighted tier.",
    prompt:
      "Create a pricing table component with three plans (Starter, Pro, Team), a monthly/yearly billing toggle that shows a savings badge, a highlighted most popular plan, and feature lists with check icons.",
  },
  {
    slug: "smart-home",
    name: "Smart Home Dashboard",
    category: "dashboards",
    description: "Room tabs, device toggles, a thermostat control and energy usage.",
    prompt:
      "Build a smart home dashboard with room tabs, device cards that can be switched on and off, a thermostat with plus and minus controls, and an energy usage bar chart. Soft dark design with rounded cards.",
    mobile: true,
  },
  {
    slug: "newsletter-signup",
    name: "Newsletter Signup",
    category: "landing-pages",
    description: "Email capture with validation, topic picks and a success state.",
    prompt:
      "Create a newsletter signup page with a bold headline, an email field with validation, selectable topic chips, a subscribe button with a loading state and a success message. Warm editorial style.",
    mobile: true,
  },
  {
    slug: "bmi-calculator",
    name: "BMI Calculator",
    category: "apps-and-games",
    description: "Metric and imperial units, live result and a color-coded scale.",
    prompt:
      "Build a BMI calculator with metric and imperial unit toggle, height and weight inputs, a live BMI result, a color-coded scale showing where the result falls, and a short explanation of each category.",
    mobile: true,
  },
  {
    slug: "login-form",
    name: "Sign In Form",
    category: "components",
    description: "Sign in / sign up tabs, validation, show password and social buttons.",
    prompt:
      "Create an authentication card with sign in and sign up tabs, email and password fields with inline validation, a show/hide password toggle, a remember me checkbox, and social login buttons.",
    mobile: true,
  },
  {
    slug: "loan-calculator",
    name: "Loan Calculator",
    category: "dashboards",
    description: "Sliders for amount, rate and term with a payment breakdown chart.",
    prompt:
      "Build a loan calculator with sliders for amount, interest rate and term, showing the monthly payment, total interest and a yearly balance bar chart. Finance-style clean design.",
  },
  {
    slug: "task-list",
    name: "Task List App",
    category: "apps-and-games",
    description: "Add, complete, filter and clear tasks with priorities.",
    prompt:
      "Build a task list app where you can add tasks with a priority, mark them complete, filter by all, active and completed, see a remaining count and clear completed tasks.",
    mobile: true,
  },
  {
    slug: "image-carousel",
    name: "Image Carousel",
    category: "components",
    description: "Slides with arrows, dots, keyboard control and autoplay.",
    prompt:
      "Create an image carousel component with large slides, previous and next arrows, dot indicators, keyboard arrow support, an autoplay toggle and slide captions.",
  },
  {
    slug: "portfolio",
    name: "Designer Portfolio",
    category: "landing-pages",
    description: "Intro, filterable project grid and a contact form.",
    prompt:
      "Build a minimal portfolio for a product designer: an intro section, a project grid filterable by category with hover effects, an about section and a contact form with a sent state. Monochrome style with large type.",
  },
];

export const getTemplate = (slug) => TEMPLATES.find((t) => t.slug === slug);

export const getCategoryLabel = (id) =>
  TEMPLATE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
