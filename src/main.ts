import { SearchEngine } from "./search";
import { renderFormulaBlock, renderInlineMath } from "./math";
import "katex/dist/katex.min.css";
import "./styles.css";
import type { ExamData, ExamProblem, ExamSection, ProblemValue, SearchResult } from "./types";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing app root.");
}

type ContentKind = "all" | "theory" | "problem";

type State = {
  data: ExamData | null;
  query: string;
  contentKind: ContentKind;
  groupId: string;
  selectedId: string | null;
  resultsScrollTop: number;
  theme: "dark" | "light";
};

const state: State = {
  data: null,
  query: "",
  contentKind: "all",
  groupId: "all",
  selectedId: null,
  resultsScrollTop: 0,
  theme: "dark",
};

let searchEngine: SearchEngine | null = null;

const loadTheme = () => {
  const saved = localStorage.getItem("cde-theme");
  state.theme = saved === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = state.theme;
};

const setTheme = (theme: "dark" | "light") => {
  state.theme = theme;
  localStorage.setItem("cde-theme", theme);
  document.documentElement.dataset.theme = theme;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });

const slideLabel = (item: { sourceSlides: number[] }) =>
  item.sourceSlides.length ? `Slide ${item.sourceSlides.join(", ")}` : "Slide nespecificat";

const getResults = () => {
  if (!state.data || !searchEngine) return [];
  return searchEngine.search(state.query, state.contentKind, state.groupId);
};

const findSectionById = (id: string) => {
  if (!state.data) return null;
  for (const topic of state.data.topics) {
    const section = topic.sections.find((item) => item.id === id);
    if (section) return { kind: "theory" as const, topic, section, score: 1, matches: [] };
  }
  for (const problemSet of state.data.problemSets) {
    const problem = problemSet.problems.find((item) => item.id === id);
    if (problem) return { kind: "problem" as const, problemSet, problem, score: 1, matches: [] };
  }
  return null;
};

const getSelected = (results: SearchResult[]) => {
  if (!results.length) return state.selectedId ? findSectionById(state.selectedId) : null;
  if (state.selectedId) {
    return (
      results.find((result) => (result.kind === "theory" ? result.section?.id : result.problem?.id) === state.selectedId) ||
      findSectionById(state.selectedId) ||
      results[0]
    );
  }
  return results[0];
};

const applySelectionScope = (id: string | null) => {
  if (!id) return;
  const selected = findSectionById(id);
  if (!selected) return;

  state.contentKind = selected.kind;
  state.groupId = selected.kind === "theory" ? selected.topic?.id || "all" : selected.problemSet?.id || "all";
};

const renderTopicButtons = (data: ExamData) => {
  const buttons = [
    `<button class="topic-button ${state.contentKind === "theory" && state.groupId === "all" ? "active" : ""}" data-kind="theory" data-group-id="all">
      <span class="nav-full">Toate</span>
      <span class="nav-short">Toate</span>
    </button>`,
    ...data.topics.map(
      (topic) =>
        `<button class="topic-button ${state.contentKind === "theory" && state.groupId === topic.id ? "active" : ""}" data-kind="theory" data-group-id="${topic.id}">
          <span class="nav-full">${topic.number}. ${escapeHtml(topic.title)}</span>
          <span class="nav-short">Tema ${topic.number}</span>
        </button>`,
    ),
  ];

  return buttons.join("");
};

const renderProblemSetButtons = (data: ExamData) => {
  const buttons = [
    `<button class="topic-button ${state.contentKind === "problem" && state.groupId === "all" ? "active" : ""}" data-kind="problem" data-group-id="all">Toate problemele</button>`,
    ...data.problemSets.map(
      (problemSet) =>
        `<button class="topic-button ${state.contentKind === "problem" && state.groupId === problemSet.id ? "active" : ""}" data-kind="problem" data-group-id="${problemSet.id}">
          ${escapeHtml(problemSet.title)}
        </button>`,
    ),
  ];

  return buttons.join("");
};

const renderGlobalButtons = () => `
  <button class="topic-button ${state.contentKind === "all" ? "active" : ""}" data-kind="all" data-group-id="all">
    Tot materialul
  </button>
`;

const rememberResultsScroll = () => {
  state.resultsScrollTop = document.querySelector<HTMLDivElement>(".results-list")?.scrollTop || 0;
};

const renderResult = (result: SearchResult, selectedId: string | null) => {
  const item = result.kind === "theory" ? result.section : result.problem;
  if (!item) return "";

  const preview =
    result.kind === "theory"
      ? result.section?.keyPoints[0] || result.section?.relevance || ""
      : result.problem?.statement || result.problem?.asks[0] || "";
  const isSelected = selectedId === item.id;
  const meta =
    result.kind === "theory"
      ? `Tema ${result.topic?.number || ""} · ${slideLabel(item as ExamSection)} · ${(item as ExamSection).images.length} imagini`
      : `${result.problemSet?.title || "Problems"} · ${slideLabel(item as ExamProblem)} · ${(item as ExamProblem).images.length} imagini`;

  return `
    <a class="result ${isSelected ? "selected" : ""}" href="#${item.id}" data-result-id="${item.id}" ${isSelected ? 'aria-current="true"' : ""}>
      <span class="result-topic">${result.kind === "theory" ? `Tema ${result.topic?.number || ""}` : "Problems"}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(preview)}</span>
      <span class="result-meta">${escapeHtml(meta)}</span>
    </a>
  `;
};

const renderImages = (item: Pick<ExamSection | ExamProblem, "images">) => {
  if (!item.images.length) {
    return `<p class="empty-note">Nu sunt imagini atașate pentru această secțiune.</p>`;
  }

  return item.images
    .map(
      (image) => `
        <figure class="study-image">
          <img src="${image.src}" alt="${escapeHtml(image.alt)}" loading="lazy" />
          <figcaption>${escapeHtml(image.alt)}</figcaption>
        </figure>
      `,
    )
    .join("");
};

const renderFormulas = (item: Pick<ExamSection | ExamProblem, "formulas">) => {
  if (!item.formulas.length) return "";

  return `
    <h3>Formule</h3>
    <div class="formula-list">
      ${item.formulas
        .map(
          (formula) => `
            <div class="formula-card">
              ${formula.label ? `<p>${escapeHtml(formula.label)}</p>` : ""}
              <div class="formula-expression">${renderFormulaBlock(formula.expression)}</div>
              ${formula.meaning ? `<span>${renderInlineMath(formula.meaning)}</span>` : ""}
            </div>
          `,
        )
        .join("")}
    </div>
  `;
};

const renderValueList = (items: ProblemValue[]) => {
  if (!items.length) return "";

  return `
    <dl class="value-list">
      ${items
        .map(
          (item) => `
            <div>
              ${item.label ? `<dt>${escapeHtml(item.label)}</dt>` : ""}
              <dd>${renderInlineMath(item.value)}</dd>
            </div>
          `,
        )
        .join("")}
    </dl>
  `;
};

const renderProblemItems = (problem: ExamProblem) => {
  if (!problem.items.length) return "";

  return `
    <h3>Subpuncte</h3>
    <div class="problem-items">
      ${problem.items
        .map(
          (item) => `
            <div class="problem-item">
              <strong>${escapeHtml(item.label)}</strong>
              ${item.expression ? `<div class="formula-expression">${renderFormulaBlock(item.expression)}</div>` : ""}
              ${item.solution ? `<p>${renderInlineMath(item.solution)}</p>` : ""}
              ${item.answer ? `<span>Răspuns: ${renderInlineMath(item.answer)}</span>` : ""}
            </div>
          `,
        )
        .join("")}
    </div>
  `;
};

const renderTheoryDetail = (selected: SearchResult) => {
  if (!selected.topic || !selected.section) return "";
  const { topic, section } = selected;

  return `
    <section class="detail">
      <div class="detail-header">
        <div>
          <p class="topic-line">Tema ${topic.number} · ${escapeHtml(topic.title)}</p>
          <h2>${escapeHtml(section.title)}</h2>
        </div>
        <span>${slideLabel(section)}</span>
      </div>

      ${
        section.relevance
          ? `<p class="relevance">${escapeHtml(section.relevance)}</p>`
          : ""
      }

      <div class="detail-grid">
        <div class="content-column">
          <h3>Puncte cheie</h3>
          <ul class="point-list">
            ${section.keyPoints.map((point) => `<li>${renderInlineMath(point)}</li>`).join("")}
          </ul>

          ${renderFormulas(section)}

          ${
            section.mustKnow.length
              ? `<h3>De știut pentru examen</h3><ul class="compact-list">${section.mustKnow
                  .map((item) => `<li>${renderInlineMath(item)}</li>`)
                  .join("")}</ul>`
              : ""
          }
        </div>

        <div class="image-column">
          <h3>Imagini</h3>
          ${renderImages(section)}
        </div>
      </div>
    </section>
  `;
};

const renderProblemDetail = (selected: SearchResult) => {
  if (!selected.problemSet || !selected.problem) return "";
  const { problemSet, problem } = selected;

  return `
    <section class="detail">
      <div class="detail-header">
        <div>
          <p class="topic-line">Problems · ${escapeHtml(problemSet.title)}</p>
          <h2>${escapeHtml(problem.title)}</h2>
        </div>
        <span>${slideLabel(problem)}</span>
      </div>

      <div class="detail-grid">
        <div class="content-column problem-content">
          ${problem.statement ? `<h3>Enunț</h3><p class="problem-statement">${renderInlineMath(problem.statement)}</p>` : ""}

          ${problem.given.length ? `<h3>Date cunoscute</h3>${renderValueList(problem.given)}` : ""}

          ${
            problem.asks.length
              ? `<h3>Cerințe</h3><ul class="compact-list">${problem.asks
                  .map((item) => `<li>${renderInlineMath(item)}</li>`)
                  .join("")}</ul>`
              : ""
          }

          ${renderFormulas(problem)}

          ${renderProblemItems(problem)}

          ${
            problem.solutionSteps.length
              ? `<h3>Rezolvare</h3><ol class="step-list">${problem.solutionSteps
                  .map(
                    (step) => `
                      <li>
                        ${step.label ? `<span>${escapeHtml(step.label)}</span>` : ""}
                        <p>${renderInlineMath(step.text)}</p>
                        ${step.latex ? `<div class="formula-expression">${renderFormulaBlock(step.latex)}</div>` : ""}
                      </li>
                    `,
                  )
                  .join("")}</ol>`
              : ""
          }

          ${problem.finalAnswer.length ? `<h3>Răspuns final</h3>${renderValueList(problem.finalAnswer)}` : ""}
        </div>

        <div class="image-column">
          <h3>Imagini</h3>
          ${renderImages(problem)}
        </div>
      </div>
    </section>
  `;
};

const renderDetail = (selected: SearchResult | null) => {
  if (!selected) {
    return `
      <section class="detail empty">
        <h2>Niciun rezultat</h2>
        <p>Încearcă un termen mai scurt sau caută după o formulă, componentă, bloc funcțional sau descriere de imagine.</p>
      </section>
    `;
  }

  return selected.kind === "problem" ? renderProblemDetail(selected) : renderTheoryDetail(selected);
};

const render = (options: { preserveResultsScroll?: boolean } = {}) => {
  const data = state.data;
  if (!data) {
    app.innerHTML = `<main class="loading">Se încarcă datele...</main>`;
    return;
  }

  const results = getResults();
  const selected = getSelected(results);
  state.selectedId = selected ? (selected.kind === "theory" ? selected.section?.id || null : selected.problem?.id || null) : null;

  app.innerHTML = `
    <main class="layout">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-row">
            <h1>CDE Exam</h1>
            <button class="theme-toggle" type="button" data-theme-toggle aria-label="Schimbă tema">
              ${state.theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
          <p>${data.stats.sectionCount} secțiuni · ${data.stats.problemCount} probleme · ${data.stats.imageCount} imagini</p>
        </div>
        <nav class="topics" aria-label="Topic filters">
          <section class="nav-section" aria-label="Global search">
            <h2>Global</h2>
            <div class="nav-scroll">${renderGlobalButtons()}</div>
          </section>
          <section class="nav-section" aria-label="Theory filters">
            <h2>Teorie</h2>
            <div class="nav-scroll">${renderTopicButtons(data)}</div>
          </section>
          <section class="nav-section" aria-label="Problem filters">
            <h2>Problems</h2>
            <div class="nav-scroll">${renderProblemSetButtons(data)}</div>
          </section>
        </nav>
      </aside>

      <section class="workspace">
        <header class="searchbar">
          <label for="search-input">Caută în materie</label>
          <input id="search-input" type="search" value="${escapeHtml(state.query)}" placeholder="ex: redresor, jonctiune pn, amplificare, mosfet..." autocomplete="off" />
        </header>

        <div class="study-shell">
          <section class="results-pane">
            <div class="results-head">
              <h2>Rezultate</h2>
              <span>${results.length}</span>
            </div>
            <div class="results-list">
              ${results.map((result) => renderResult(result, state.selectedId)).join("")}
            </div>
          </section>

          ${renderDetail(selected)}
        </div>
      </section>
    </main>
  `;

  if (options.preserveResultsScroll) {
    const resultsList = document.querySelector<HTMLDivElement>(".results-list");
    if (resultsList) resultsList.scrollTop = state.resultsScrollTop;
  }
};

app.addEventListener("input", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.id === "search-input") {
    state.query = target.value;
    state.selectedId = null;
    state.resultsScrollTop = 0;
    render();
    const input = document.querySelector<HTMLInputElement>("#search-input");
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }
});

app.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const navButton = target.closest<HTMLButtonElement>("[data-kind][data-group-id]");
  if (navButton) {
    const kind = navButton.dataset.kind;
    state.contentKind = kind === "problem" || kind === "theory" ? kind : "all";
    state.groupId = navButton.dataset.groupId || "all";
    state.selectedId = null;
    state.resultsScrollTop = 0;
    render();
    return;
  }

  const themeToggle = target.closest<HTMLButtonElement>("[data-theme-toggle]");
  if (themeToggle) {
    setTheme(state.theme === "dark" ? "light" : "dark");
    render({ preserveResultsScroll: true });
    return;
  }

  const resultLink = target.closest<HTMLAnchorElement>("[data-result-id]");
  if (resultLink) {
    event.preventDefault();
    rememberResultsScroll();
    state.selectedId = resultLink.dataset.resultId || null;
    history.replaceState(null, "", resultLink.hash);
    render({ preserveResultsScroll: true });
    // On mobile, scroll detail panel into view after selection
    if (window.innerWidth <= 980) {
      requestAnimationFrame(() => {
        document.querySelector(".detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }
});

window.addEventListener("hashchange", () => {
  state.selectedId = window.location.hash ? window.location.hash.slice(1) : null;
  applySelectionScope(state.selectedId);
  render({ preserveResultsScroll: true });
  if (window.innerWidth <= 980 && state.selectedId) {
    requestAnimationFrame(() => {
      document.querySelector(".detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
});

const load = async () => {
  loadTheme();
  const response = await fetch("data/exam-data.json");
  if (!response.ok) {
    throw new Error(`Failed to load data: ${response.status}`);
  }

  state.data = (await response.json()) as ExamData;
  searchEngine = new SearchEngine(state.data);
  state.selectedId = window.location.hash ? window.location.hash.slice(1) : null;
  applySelectionScope(state.selectedId);
  render();
};

load().catch((error) => {
  app.innerHTML = `<main class="loading error">Nu am putut încărca datele: ${escapeHtml(error.message)}</main>`;
});
