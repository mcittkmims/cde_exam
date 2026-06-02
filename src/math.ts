import katex from "katex";

const greek: Record<string, string> = {
  α: "{\\alpha}",
  β: "{\\beta}",
  γ: "{\\gamma}",
  Δ: "{\\Delta}",
  δ: "{\\delta}",
  ε: "{\\varepsilon}",
  φ: "{\\varphi}",
  ω: "{\\omega}",
  π: "{\\pi}",
  ρ: "{\\rho}",
  τ: "{\\tau}",
};

const superscripts: Record<string, string> = {
  "²": "^2",
  "³": "^3",
};

const repairEscapedLatex = (value: string) =>
  value
    .replace(/\u0007pprox/g, "\\approx")
    .replace(/\u000c/g, "\\f")
    .replace(/\u0009(?=ext\{)/g, "\\t")
    .replace(/\u0009(?=o\b)/g, "\\t")
    .replace(/\u000d(?=ight)/g, "\\r");

const escapeLatexText = (value: string) => value.replace(/_/g, "\\_");

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });

const replaceSymbolNames = (value: string) =>
  value
    .replace(/\b(IDSS|IFSM|IFRM|VRRM|VFM|IFM|VBR|VGS|VDS|VGD|VBE|VCE|VBC|VEB|VCB|UCE|UBE|UCB|UEB|VT|IC|IB|IE|RC|RE|RL|RS|RG|RD)\b/g, (match) => `${match[0]}_{${match.slice(1)}}`)
    .replace(/\b([Rr])([cesdgl])\b/g, "$1_{$2}")
    .replace(/\b(Au|Ai|Ap|gm)\b/g, (match) => `${match[0]}_{${match.slice(1)}}`)
    .replace(/\bh([0-9]{2})\b/g, "h_{$1}")
    .replace(/\bd([A-Z])_([A-Za-z0-9]+)\b/g, "d$1_{$2}")
    .replace(/\b([ui])([a-z]{1,3})\b/g, "$1_{$2}")
    .replace(/\b([A-Za-z])_([A-Za-z0-9]+)\b/g, "$1_{$2}")
    .replace(/\b([A-Z])(max|min|med|ef|oef|ech|lim|ref|out|in|sarc|sat)\b/g, "$1_{$2}")
    .replace(/β([A-Za-z0-9]+)/g, "β_{$1}")
    .replace(/\b([a-z])([0-9])\b/g, "$1_{$2}")
    .replace(/\bn_i\b/g, "n_{i}")
    .replace(/\bni\b/g, "n_{i}")
    .replace(/(?<!\{)\b([iu])([A-Z]{1,2})\b/g, "$1_{$2}")
    .replace(/(?<!\{)\b([A-Z])([A-Z]{1,2})\b/g, "$1_{$2}");

const replaceSimpleFractions = (value: string) =>
  value
    .replace(/\b([A-Za-z0-9_{}]+)\/√([A-Za-z0-9_{}]+)/g, "\\frac{$1}{\\sqrt{$2}}")
    .replace(/\(([^()]+)\)\/\(([^()]+)\)/g, "\\frac{$1}{$2}")
    .replace(/\b([A-Za-z0-9_{}]+)\/\(([^()]+)\)/g, "\\frac{$1}{$2}")
    .replace(/\(([^()/]+)\/([^()/]+)\)/g, "\\frac{$1}{$2}")
    .replace(/\b([A-Za-z0-9_{}]+)\/([A-Za-z0-9_{}]+)\b/g, "\\frac{$1}{$2}");

const replaceIntegralLimits = (value: string) =>
  value.replace(/∫_([^\s^]+)\^([^\s]+)\s*/g, "\\int_{$1}^{$2} ");

const replaceKnownSqrt = (value: string) =>
  value.replace(/sqrt\(\(1\/T\)\s*·\s*∫_0\^T\s*x²\(t\)\s*dt\)/g, "\\sqrt{\\frac{1}{T}\\int_{0}^{T}x^2(t)\\,dt}");

const clarifyImpliedMultiplication = (value: string) =>
  value
    .replace(/\brI\b/g, "r \\cdot I")
    .replace(/ωt/g, "ω t")
    .replace(/τc/g, "τ_{c}")
    .replace(/\b([Rr])([A-Z])\b/g, "$1 \\cdot $2");

const replaceMathFunctions = (value: string) =>
  value
    .replace(/\bsin\s*\(/g, "\\sin(")
    .replace(/\bcos\s*\(/g, "\\cos(")
    .replace(/\btg\s*\(/g, "\\tan(")
    .replace(/\btan\s*\(/g, "\\tan(");

const protectTextBlocks = (value: string) => {
  const blocks: string[] = [];
  const latex = value.replace(/\\text\{[^}]*\}/g, (match) => {
    const token = `§${blocks.length}§`;
    blocks.push(match);
    return token;
  });

  return {
    latex,
    restore: (nextValue: string) => nextValue.replace(/§([0-9]+)§/g, (_, index) => blocks[Number(index)] || ""),
  };
};

export const toLatex = (expression: string) => {
  let latex = repairEscapedLatex(expression)
    .trim()
    .replace(/\u0009ext\{([^}]+)\}/g, "\\text{$1}")
    .replace(/^ext\{([^}]+)\}/g, "\\text{$1}")
    .replace(/\\text\{([^}]+)\}/g, "\\text{$1}");

  const protectedText = protectTextBlocks(latex);
  latex = protectedText.latex;

  latex = replaceKnownSqrt(latex);
  latex = clarifyImpliedMultiplication(latex);
  latex = latex.replace(/(\d)π([A-Za-z])/g, "$1π \\cdot $2");
  latex = replaceIntegralLimits(latex);
  latex = replaceSimpleFractions(latex);
  latex = replaceSymbolNames(latex);
  latex = replaceMathFunctions(latex);
  latex = latex.replace(/\blog10\b/g, "\\log_{10}");
  latex = latex.replace(/[αβγΔδεφωπρτ]/g, (match) => greek[match] || match);
  latex = latex.replace(/[²³]/g, (match) => superscripts[match] || match);
  latex = latex.replace(/√([A-Za-z0-9_{}]+)/g, "\\sqrt{$1}");
  latex = latex.replace(/·/g, "\\cdot");
  latex = latex.replace(/\\cdot(?=\S)/g, "\\cdot ");
  latex = latex.replace(/−/g, "-");
  latex = latex.replace(/\bdt\b/g, "\\,dt");
  latex = latex.replace(/\\,\\,dt/g, "\\,dt");
  latex = latex.replace(/\bconst\./g, "\\text{const.}");
  latex = latex.replace(/\bsau\b/g, "\\quad\\text{sau}\\quad");

  return protectedText.restore(latex);
};

const inlineFormulaPattern =
  /(?:\\text\{[^}]+\}\s*)?[A-Za-z0-9αβγΔδεφωπρτ√Σ][A-Za-z0-9_{}()[\]\/√ΣαβγΔδεφωπρτ+\-·,^\\]*\s*(?:=|≈|>|<|≤|≥|∝|\\approx|\\to)[^.;,]+/g;

const trimFormulaEdges = (value: string) => {
  const match = value.match(/^(\s*)(.*?)(\s*)$/);
  const formula = match?.[2] || value;
  const keywordSplit = formula.search(/\s+(pentru|cu|ca|unde|dacă|si|și)\b|—/i);
  const cleanFormula = keywordSplit > 0 ? formula.slice(0, keywordSplit).trimEnd() : formula;
  const trailingText = keywordSplit > 0 ? formula.slice(keywordSplit) : "";

  return {
    before: match?.[1] || "",
    formula: cleanFormula,
    after: `${trailingText}${match?.[3] || ""}`,
  };
};

const shouldRenderInlineFormula = (formula: string) => {
  const rhs = formula.split(/=|≈|>|<|≤|≥|∝|\\approx|\\to/).slice(1).join(" ");
  if (/^[a-zăâîșț\s]+$/i.test(rhs.trim()) && !/[A-Z0-9_{}\\αβγΔδεφωπρτ√Σ]/.test(rhs)) return false;
  return true;
};

export const renderMath = (expression: string) => {
  const latex = toLatex(expression);

  try {
    return katex.renderToString(latex, {
      displayMode: true,
      throwOnError: false,
      strict: "ignore",
      trust: false,
    });
  } catch {
    return `<code class="formula-expression">${escapeHtml(escapeLatexText(expression))}</code>`;
  }
};

export const isMixedTextExpression = (expression: string) => {
  if (/\\text\{/.test(repairEscapedLatex(expression))) return false;
  return /\b(pentru|dacă|formula|gama|sensibilitatea|terminale|clasa|direct|invers|model|ideal|aproximativ|scade|domeniul|regiunea|catod|anod|poartă|blocare|intersecția)\b/i.test(
    expression,
  );
};

export const renderFormulaBlock = (expression: string) => {
  if (isMixedTextExpression(expression)) {
    return `<div class="formula-inline-text">${renderInlineMath(expression)}</div>`;
  }

  return renderMath(expression);
};

export const renderInlineMath = (text: string) => {
  let html = "";
  let lastIndex = 0;

  for (const match of text.matchAll(inlineFormulaPattern)) {
    const raw = match[0];
    const index = match.index || 0;
    const { before, formula, after } = trimFormulaEdges(raw);

    html += escapeHtml(text.slice(lastIndex, index));
    html += escapeHtml(before);
    if (!shouldRenderInlineFormula(formula)) {
      html += escapeHtml(formula);
    } else try {
      html += katex.renderToString(toLatex(formula), {
        displayMode: false,
        throwOnError: false,
        strict: "ignore",
        trust: false,
      });
    } catch {
      html += escapeHtml(formula);
    }
    html += escapeHtml(after);
    lastIndex = index + raw.length;
  }

  html += escapeHtml(text.slice(lastIndex));
  return html;
};
