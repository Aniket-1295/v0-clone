// Lazy loaders for the template pages, keyed by slug (see ./registry.js).
export const TEMPLATE_LOADERS = {
  "saas-landing": () => import("./components/saas-landing"),
  "analytics-dashboard": () => import("./components/analytics-dashboard"),
  "memory-game": () => import("./components/memory-game"),
  "pricing-table": () => import("./components/pricing-table"),
  "smart-home": () => import("./components/smart-home"),
  "newsletter-signup": () => import("./components/newsletter-signup"),
  "bmi-calculator": () => import("./components/bmi-calculator"),
  "login-form": () => import("./components/login-form"),
  "loan-calculator": () => import("./components/loan-calculator"),
  "task-list": () => import("./components/task-list"),
  "image-carousel": () => import("./components/image-carousel"),
  portfolio: () => import("./components/portfolio"),
};
