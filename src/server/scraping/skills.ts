/**
 * Best-effort "main skills" extraction from free text. Most job postings
 * never fill schema.org's non-standard `skills` field, so the only realistic
 * signal on most pages is scanning the description/body prose for recognized
 * skill names. Curated dictionary, not NLP — good enough for a pre-filled
 * form the user always reviews before saving.
 */

// Canonical casing is what gets shown to the user, so keep it "as written"
// rather than upper/lowercased.
// No bare single-letter entries (a lone "R" false-matches inside "R$", the
// Brazilian Real symbol, and inside plenty of other unrelated abbreviations).
const KNOWN_SKILLS = [
  // Languages
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Golang", "Rust", "Ruby",
  "PHP", "Swift", "Kotlin", "Scala", "Elixir", "Clojure", "Haskell", "MATLAB", "Perl",
  "Objective-C", "Dart", "Bash", "Shell scripting", "SQL",
  // Frontend
  "React", "Vue", "Angular", "Svelte", "Next.js", "Nuxt", "Redux", "HTML", "CSS", "Sass",
  "Tailwind CSS", "Webpack", "Vite", "jQuery",
  // Backend / frameworks
  "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring", "Spring Boot", "Rails",
  ".NET", "ASP.NET", "Laravel", "GraphQL", "REST", "gRPC", "Microservices",
  // Databases
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Elasticsearch", "DynamoDB",
  "Cassandra", "Oracle", "MariaDB", "Snowflake", "BigQuery",
  // Cloud / infra
  "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform", "Ansible",
  "Jenkins", "GitHub Actions", "GitLab CI", "CI/CD", "Linux", "Nginx", "Serverless",
  // Data / ML
  "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy",
  "Data Science", "Data Engineering", "ETL", "Spark", "Airflow", "NLP",
  // Mobile
  "iOS", "Android", "React Native", "Flutter",
  // Tools / other tech
  "Git", "Figma", "Sketch", "Jira", "Confluence", "Salesforce", "HubSpot", "Tableau",
  "Power BI", "Excel", "Selenium", "Cypress", "Jest", "Playwright",
  // Design / product
  "UX Research", "User Research", "UI Design", "Design Systems", "Product Management",
  "Wireframing", "Prototyping", "Accessibility",
  // Methodology / general professional
  "Agile", "Scrum", "Kanban", "Project Management", "Stakeholder Management",
  "A/B Testing", "SEO", "Content Marketing", "Copywriting",
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary regex that works for skills ending/starting in symbols
 * (`C++`, `C#`, `.NET`, `Node.js`) where `\b` alone can't anchor. */
function buildSkillPattern(skill: string): RegExp {
  const escaped = escapeRegex(skill);
  const startsWithWordChar = /^[A-Za-z0-9]/.test(skill);
  const endsWithWordChar = /[A-Za-z0-9]$/.test(skill);
  const left = startsWithWordChar ? "(?<![A-Za-z0-9])" : "";
  const right = endsWithWordChar ? "(?![A-Za-z0-9])" : "";
  return new RegExp(`${left}${escaped}${right}`, "i");
}

const SKILL_PATTERNS: [string, RegExp][] = KNOWN_SKILLS.map((skill) => [skill, buildSkillPattern(skill)]);

/** Scans free text (any HTML is stripped first) for known skill names and
 * returns the ones found, in the order they first appear, capped at `limit`. */
export function extractSkillsFromText(
  text: string | null | undefined,
  limit = 12,
): string[] {
  if (!text) return [];
  const plain = text.replace(/<[^>]+>/g, " ");
  if (!plain.trim()) return [];

  const found: { skill: string; index: number }[] = [];
  for (const [skill, pattern] of SKILL_PATTERNS) {
    const match = pattern.exec(plain);
    if (match) found.push({ skill, index: match.index });
  }

  return found
    .sort((a, b) => a.index - b.index)
    .slice(0, limit)
    .map((f) => f.skill);
}
