import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const sources = [
  {
    topicNumber: 1,
    dir: "1/exam_extract",
    json: "1/exam_extract/exam_relevant_extract.json",
    titleFallback: "Noțiuni de bază despre circuite",
  },
  {
    topicNumber: 2,
    dir: "2/exam_extract_tema2",
    json: "2/exam_extract_tema2/exam_relevant_extract_tema2.json",
    titleFallback: "Semiconductori și diode",
  },
  {
    topicNumber: 3,
    dir: "3/exam_extract_tema3",
    json: "3/exam_extract_tema3/exam_relevant_extract_tema3.json",
    titleFallback: "Redresoare și surse de alimentare",
  },
  {
    topicNumber: 4,
    dir: "4/exam_extract_tema4",
    json: "4/exam_extract_tema4/exam_relevant_extract_tema4.json",
    titleFallback: "Tranzistoare bipolare",
  },
  {
    topicNumber: 5,
    dir: "5/exam_extract_tema5",
    json: "5/exam_extract_tema5/exam_relevant_extract_tema5.json",
    titleFallback: "Amplificatoare cu tranzistoare",
  },
  {
    topicNumber: 6,
    dir: "6/exam_relevant_extract_tema6_with_images",
    json: "6/exam_relevant_extract_tema6_with_images/exam_relevant_extract_tema6.json",
    titleFallback: "Tranzistoare cu efect de câmp",
  },
];

const problemSources = [
  {
    id: "voltage-dividers",
    dir: "raw/voltage_dividers_topology_checked_with_images",
    json: "raw/voltage_dividers_topology_checked_with_images/voltage_dividers_extracted_topology_checked.json",
    titleFallback: "Divizoare de tensiune",
  },
  {
    id: "ohm-kirchhoff",
    dir: "raw/ohm_problems_topology_checked_with_images",
    json: "raw/ohm_problems_topology_checked_with_images/ohm_problems_extracted_topology_checked.json",
    titleFallback: "Legea lui Ohm și Kirchhoff",
  },
  {
    id: "diode-semiconductors",
    dir: "raw/diode_semiconductoare_topology_checked_with_images",
    json: "raw/diode_semiconductoare_topology_checked_with_images/diode_semiconductoare_extracted_topology_checked.json",
    titleFallback: "Diode semiconductoare",
  },
  {
    id: "bjt",
    dir: "raw/bjt_problems_topology_checked_with_images",
    json: "raw/bjt_problems_topology_checked_with_images/bjt_problems_extracted_topology_checked.json",
    titleFallback: "Probleme BJT",
  },
  {
    id: "bjt-regions",
    dir: "raw/bjt_p2_problems_topology_checked_with_images",
    json: "raw/bjt_p2_problems_topology_checked_with_images/bjt_p2_problems_extracted_topology_checked.json",
    titleFallback: "Regiuni de funcționare BJT",
  },
];

const publicAssetsDir = path.join(root, "public", "exam-assets");
rmSync(publicAssetsDir, { recursive: true, force: true });
mkdirSync(publicAssetsDir, { recursive: true });

const slug = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const normalizeTextValue = (value) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(normalizeTextValue).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    return [value.name, value.formula, value.meaning, value.description, value.text, value.value].filter(Boolean).join(" - ");
  }
  return "";
};

const normalizeFormula = (value) => {
  if (typeof value === "string") {
    return {
      label: "",
      expression: value,
      meaning: "",
      text: value,
    };
  }

  if (typeof value === "number" || typeof value === "boolean") {
    const text = String(value);
    return {
      label: "",
      expression: text,
      meaning: "",
      text,
    };
  }

  if (value && typeof value === "object") {
    const label = normalizeTextValue(value.name);
    const expression = normalizeTextValue(value.formula || value.expression || value.value);
    const meaning = normalizeTextValue(value.meaning || value.description || value.text);
    return {
      label,
      expression: expression || normalizeTextValue(value),
      meaning,
      text: [label, expression, meaning].filter(Boolean).join(" - "),
    };
  }

  return null;
};

const normalizeImage = (image, source, sectionId, index) => {
  const imagePath = typeof image === "string" ? image : image.path || image.file;
  if (!imagePath) return null;

  const from = path.join(root, source.dir, imagePath);
  if (!existsSync(from)) return null;

  const ext = path.extname(imagePath);
  const fileName = `${sectionId}-${index + 1}${ext}`;
  const topicDir = path.join(publicAssetsDir, "theory", `topic-${source.topicNumber}`);
  mkdirSync(topicDir, { recursive: true });
  copyFileSync(from, path.join(topicDir, fileName));

  return {
    id: `${sectionId}-image-${index + 1}`,
    src: `exam-assets/theory/topic-${source.topicNumber}/${fileName}`,
    originalPath: imagePath,
    alt:
      image.description ||
      image.caption ||
      `Imagine din tema ${source.topicNumber}, secțiunea ${sectionId}`,
    sourceSlide: image.source_slide || image.slide || null,
    type: image.source_type || image.type || "slide_image",
  };
};

const normalizeProblemImage = (image, source, problemId, index) => {
  const imagePath = typeof image === "string" ? image : image.path || image.file;
  if (!imagePath) return null;

  const from = path.join(root, source.dir, imagePath);
  if (!existsSync(from)) return null;

  const ext = path.extname(imagePath);
  const fileName = `${problemId}-${index + 1}${ext}`;
  const problemDir = path.join(publicAssetsDir, "problems", source.id);
  mkdirSync(problemDir, { recursive: true });
  copyFileSync(from, path.join(problemDir, fileName));

  return {
    id: `${problemId}-image-${index + 1}`,
    src: `exam-assets/problems/${source.id}/${fileName}`,
    originalPath: imagePath,
    alt:
      image.description ||
      image.caption ||
      `Imagine pentru problema ${problemId}`,
    sourceSlide: image.source_slide || image.slide || null,
    type: image.source_type || image.type || "problem_image",
  };
};

const normalizeValueList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const label = normalizeTextValue(item.label || item.name || item.key || `item ${index + 1}`);
          const itemValue = normalizeTextValue(item.value || item.text || item.description || item.formula || item);
          return { label, value: itemValue };
        }
        return { label: "", value: normalizeTextValue(item) };
      })
      .filter((item) => item.label || item.value);
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([label, itemValue]) => ({ label, value: normalizeTextValue(itemValue) }))
      .filter((item) => item.label || item.value);
  }

  return [{ label: "", value: normalizeTextValue(value) }].filter((item) => item.value);
};

const normalizeProblemStep = (step, index) => {
  if (typeof step === "string") {
    return { label: "", text: step, latex: "" };
  }

  if (step && typeof step === "object") {
    return {
      label: normalizeTextValue(step.part || step.label || ""),
      text: normalizeTextValue(step.text || step.description || `Pasul ${index + 1}`),
      latex: normalizeTextValue(step.latex || step.formula || step.expression || ""),
    };
  }

  return null;
};

const normalizeProblemItem = (item, index) => {
  if (!item || typeof item !== "object") return null;
  return {
    label: normalizeTextValue(item.label || String.fromCharCode(97 + index)),
    expression: normalizeTextValue(item.expression_latex || item.expression || item.problem || ""),
    solution: normalizeTextValue(item.solution_latex || item.solution || ""),
    answer: normalizeTextValue(item.answer_latex || item.answer || ""),
  };
};

const imageLookupFromIndex = (data) => {
  const lookup = new Map();
  for (const image of asArray(data.image_index)) {
    if (image.id) lookup.set(image.id, image);
  }
  return lookup;
};

const normalizeSection = (raw, source, data, index) => {
  const id = raw.id || `topic-${source.topicNumber}-section-${index + 1}`;
  const sectionId = `t${source.topicNumber}-${slug(id || raw.title || index + 1)}`;
  const lookup = imageLookupFromIndex(data);
  const rawImages = asArray(raw.images).map((image) => {
    if (typeof image === "string" && lookup.has(image)) {
      return lookup.get(image);
    }
    return image;
  });

  const keyPoints = [
    ...asArray(raw.key_points),
    ...asArray(raw.text),
  ].filter(Boolean);

  const images = rawImages
    .map((image, imageIndex) => normalizeImage(image, source, sectionId, imageIndex))
    .filter(Boolean);

  const searchText = [
    raw.title,
    raw.exam_relevance,
    ...keyPoints,
    ...asArray(raw.formulas).map(normalizeFormula).filter(Boolean).map((formula) => formula.text),
    ...asArray(raw.must_know_terms).map(normalizeTextValue),
    ...asArray(raw.must_know_for_exam).map(normalizeTextValue),
    ...images.map((image) => image.alt),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: sectionId,
    title: raw.title || `Secțiunea ${index + 1}`,
    sourceSlides: asArray(raw.source_slides),
    relevance: raw.exam_relevance || "",
    keyPoints,
    formulas: asArray(raw.formulas).map(normalizeFormula).filter(Boolean),
    mustKnow: [...asArray(raw.must_know_terms), ...asArray(raw.must_know_for_exam)].map(normalizeTextValue).filter(Boolean),
    images,
    searchText,
  };
};

const normalizeProblem = (raw, source, index) => {
  const rawId = raw.id || `problem-${index + 1}`;
  const problemId = `p-${source.id}-${slug(rawId || raw.title || index + 1)}`;
  const formulas = asArray(raw.formulas_latex || raw.formulas).map(normalizeFormula).filter(Boolean);
  const solutionSteps = asArray(raw.solution_steps).map(normalizeProblemStep).filter(Boolean);
  const items = asArray(raw.items).map(normalizeProblemItem).filter(Boolean);
  const images = asArray(raw.images)
    .map((image, imageIndex) => normalizeProblemImage(image, source, problemId, imageIndex))
    .filter(Boolean);
  const given = normalizeValueList(raw.given);
  const finalAnswer = normalizeValueList(raw.final_answer || raw.answer);
  const asks = asArray(raw.asks || raw.requirements).map(normalizeTextValue).filter(Boolean);

  const searchText = [
    raw.title,
    raw.problem_text,
    ...given.map((item) => `${item.label} ${item.value}`),
    ...asks,
    ...formulas.map((formula) => formula.text),
    ...solutionSteps.map((step) => [step.label, step.text, step.latex].filter(Boolean).join(" ")),
    ...items.map((item) => [item.label, item.expression, item.solution, item.answer].filter(Boolean).join(" ")),
    ...finalAnswer.map((item) => `${item.label} ${item.value}`),
    ...images.map((image) => image.alt),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: problemId,
    title: raw.title || `Problema ${index + 1}`,
    sourceSlides: asArray(raw.source_slides),
    statement: raw.problem_text || "",
    given,
    asks,
    formulas,
    solutionSteps,
    finalAnswer,
    items,
    images,
    searchText,
  };
};

const topics = sources.map((source) => {
  const data = JSON.parse(readFileSync(path.join(root, source.json), "utf8"));
  const rawSections = asArray(data.exam_sections || data.items || data.sections);
  const topicId = `topic-${source.topicNumber}`;
  const sections = rawSections.map((section, index) => normalizeSection(section, source, data, index));
  return {
    id: topicId,
    number: source.topicNumber,
    title: data.topic || source.titleFallback,
    sourceFile: data.source_file || "",
    language: data.language || "ro",
    sections,
  };
});

const problemSets = problemSources.map((source) => {
  const data = JSON.parse(readFileSync(path.join(root, source.json), "utf8"));
  const rawProblems = asArray(data.problems || data.items || data.examples || data.exercises);
  return {
    id: `problems-${source.id}`,
    title: data.topic || data.title || source.titleFallback,
    sourceFile: data.source_file || "",
    language: data.language || "ro",
    problems: rawProblems.map((problem, index) => normalizeProblem(problem, source, index)),
  };
});

const allImages = topics.flatMap((topic) =>
  topic.sections.flatMap((section) =>
    section.images.map((image) => ({
      ...image,
      topicId: topic.id,
      sectionId: section.id,
    })),
  ),
);

const allProblemImages = problemSets.flatMap((problemSet) =>
  problemSet.problems.flatMap((problem) =>
    problem.images.map((image) => ({
      ...image,
      problemSetId: problemSet.id,
      problemId: problem.id,
    })),
  ),
);

const data = {
  generatedAt: new Date().toISOString(),
  title: "CDE Exam Study Index",
  topics,
  problemSets,
  stats: {
    topicCount: topics.length,
    sectionCount: topics.reduce((count, topic) => count + topic.sections.length, 0),
    problemSetCount: problemSets.length,
    problemCount: problemSets.reduce((count, problemSet) => count + problemSet.problems.length, 0),
    imageCount: allImages.length + allProblemImages.length,
  },
};

writeFileSync(path.join(root, "public", "data", "exam-data.json"), `${JSON.stringify(data, null, 2)}\n`);
writeFileSync(path.join(root, "src", "generated-data-summary.json"), `${JSON.stringify(data.stats, null, 2)}\n`);
console.log(
  `Built ${data.stats.topicCount} topics, ${data.stats.sectionCount} sections, ${data.stats.problemCount} problems, ${data.stats.imageCount} images.`,
);
