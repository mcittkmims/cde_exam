export type ExamImage = {
  id: string;
  src: string;
  originalPath: string;
  alt: string;
  sourceSlide: number | null;
  type: string;
};

export type ExamFormula = {
  label: string;
  expression: string;
  meaning: string;
  text: string;
};

export type ExamSection = {
  id: string;
  title: string;
  sourceSlides: number[];
  relevance: string;
  keyPoints: string[];
  formulas: ExamFormula[];
  mustKnow: string[];
  images: ExamImage[];
  searchText: string;
};

export type ProblemValue = {
  label: string;
  value: string;
};

export type ProblemStep = {
  label: string;
  text: string;
  latex: string;
};

export type ProblemItem = {
  label: string;
  expression: string;
  solution: string;
  answer: string;
};

export type ExamProblem = {
  id: string;
  title: string;
  sourceSlides: number[];
  statement: string;
  given: ProblemValue[];
  asks: string[];
  formulas: ExamFormula[];
  solutionSteps: ProblemStep[];
  finalAnswer: ProblemValue[];
  items: ProblemItem[];
  images: ExamImage[];
  searchText: string;
};

export type ExamProblemSet = {
  id: string;
  title: string;
  sourceFile: string;
  language: string;
  problems: ExamProblem[];
};

export type ExamTopic = {
  id: string;
  number: number;
  title: string;
  sourceFile: string;
  language: string;
  sections: ExamSection[];
};

export type ExamData = {
  generatedAt: string;
  title: string;
  topics: ExamTopic[];
  problemSets: ExamProblemSet[];
  stats: {
    topicCount: number;
    sectionCount: number;
    problemSetCount: number;
    problemCount: number;
    imageCount: number;
  };
};

export type SearchResult = {
  kind: "theory" | "problem";
  topic?: ExamTopic;
  section?: ExamSection;
  problemSet?: ExamProblemSet;
  problem?: ExamProblem;
  score: number;
  matches: string[];
};
