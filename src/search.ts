import type { ExamData, ExamProblem, ExamProblemSet, ExamSection, ExamTopic, SearchResult } from "./types";

type IndexedSection = {
  kind: "theory" | "problem";
  topic?: ExamTopic;
  section?: ExamSection;
  problemSet?: ExamProblemSet;
  problem?: ExamProblem;
  title: string;
  text: string;
  imageText: string;
  terms: string[];
};

type SearchScope = "all" | "theory" | "problem";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokenize = (value: string) => {
  const parts = normalize(value).split(/\s+/).filter(Boolean);
  const compactPairs = parts
    .slice(0, -1)
    .map((part, index) => (part.length === 1 && parts[index + 1].length === 1 ? `${part}${parts[index + 1]}` : ""))
    .filter(Boolean);

  return [...parts.filter((token) => token.length > 1), ...compactPairs];
};

const unique = <T>(items: T[]) => [...new Set(items)];

const simplifyTechnicalTerm = (value: string) => value.replace(/ch/g, "h").replace(/(.)\1+/g, "$1");

const levenshtein = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] =
        a[i - 1] === b[j - 1]
          ? row[j - 1]
          : Math.min(row[j - 1] + 1, previous + 1, current + 1);
      previous = current;
    }
    row[0] = i;
  }
  return row[b.length];
};

const fuzzyTermScore = (query: string, term: string) => {
  if (term === query) return 14;
  if (simplifyTechnicalTerm(term) === simplifyTechnicalTerm(query)) return 12;
  if (term.startsWith(query)) return 10;
  if (term.includes(query) || query.includes(term)) return 7;

  const lengthGap = Math.abs(term.length - query.length);
  if (query.length < 4 || lengthGap > 3) return 0;

  const distance = levenshtein(query, term);
  const maxLength = Math.max(query.length, term.length);
  const limit = maxLength > 8 ? 3 : maxLength > 5 ? 2 : 1;
  return distance <= limit ? 5 - distance : 0;
};

const buildTheoryIndex = (data: ExamData): IndexedSection[] =>
  data.topics.flatMap((topic) =>
    topic.sections.map((section) => {
      const title = normalize(section.title);
      const imageText = normalize(section.images.map((image) => image.alt).join(" "));
      const text = normalize(
        [
          section.title,
          section.relevance,
          ...section.keyPoints,
          ...section.formulas.map((formula) => formula.text),
          ...section.mustKnow,
          imageText,
        ].join(" "),
      );

      return {
        kind: "theory",
        topic,
        section,
        title,
        text,
        imageText,
        terms: unique(tokenize(text)),
      };
    }),
  );

const buildProblemIndex = (data: ExamData): IndexedSection[] =>
  data.problemSets.flatMap((problemSet) =>
    problemSet.problems.map((problem) => {
      const title = normalize(problem.title);
      const imageText = normalize(problem.images.map((image) => image.alt).join(" "));
      const text = normalize(
        [
          problem.title,
          problem.statement,
          ...problem.given.map((item) => `${item.label} ${item.value}`),
          ...problem.asks,
          ...problem.formulas.map((formula) => formula.text),
          ...problem.solutionSteps.map((step) => [step.label, step.text, step.latex].filter(Boolean).join(" ")),
          ...problem.items.map((item) => [item.label, item.expression, item.solution, item.answer].filter(Boolean).join(" ")),
          ...problem.finalAnswer.map((item) => `${item.label} ${item.value}`),
          imageText,
        ].join(" "),
      );

      return {
        kind: "problem",
        problemSet,
        problem,
        title,
        text,
        imageText,
        terms: unique(tokenize(text)),
      };
    }),
  );

const buildIndex = (data: ExamData): IndexedSection[] => [...buildTheoryIndex(data), ...buildProblemIndex(data)];

export class SearchEngine {
  private readonly index: IndexedSection[];

  constructor(data: ExamData) {
    this.index = buildIndex(data);
  }

  search(query: string, kind: SearchScope, groupId: string): SearchResult[] {
    const tokens = tokenize(query);
    const scoped = this.index.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (groupId === "all") return true;
      if (item.kind === "theory") return item.topic?.id === groupId;
      return item.problemSet?.id === groupId;
    });

    if (!tokens.length) {
      return scoped.map((item) => ({
        kind: item.kind,
        topic: item.topic,
        section: item.section,
        problemSet: item.problemSet,
        problem: item.problem,
        score: 1,
        matches: [],
      }));
    }

    return scoped
      .map((item) => {
        const matches: string[] = [];
        let score = 0;

        for (const token of tokens) {
          let tokenScore = 0;
          for (const term of item.terms) {
            tokenScore = Math.max(tokenScore, fuzzyTermScore(token, term));
          }

          if (tokenScore > 0) {
            matches.push(token);
            score += tokenScore;
          }

          if (item.title.includes(token)) score += 12;
          if (tokenize(item.section?.title || item.problem?.title || "").some((term) => simplifyTechnicalTerm(term) === simplifyTechnicalTerm(token))) {
            score += 28;
          }
          if (item.imageText.includes(token)) score += 4;
        }

        if (normalize(query).length > 3 && item.text.includes(normalize(query))) {
          score += 20;
        }

        score += (item.section?.images.length || item.problem?.images.length || 0) ? 1.5 : 0;

        return {
          kind: item.kind,
          topic: item.topic,
          section: item.section,
          problemSet: item.problemSet,
          problem: item.problem,
          score,
          matches: unique(matches),
        };
      })
      .filter((result) => result.score > 0 && result.matches.length >= Math.ceil(tokens.length * 0.5))
      .sort((a, b) => b.score - a.score)
      .slice(0, 40);
  }
}
