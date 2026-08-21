import { GoogleGenAI } from '@google/genai';
import { env, isAiEnabled } from '../../config/env.js';
import { logger } from '../../common/logger.js';

let client = null;
function getClient() {
  if (!isAiEnabled()) return null;
  if (!client) client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

/**
 * Narrative Agent's only job: turn an *already-decided* recommendation
 * object into readable analyst prose. It is given the finished decision and
 * its evidence as context — it cannot change the decision, only describe it.
 * This is what keeps the LLM out of the black-box role: see ARCHITECTURE.md §5.
 */
export async function generateNarrative({ companyName, loanAmount, decisionResult }) {
  const gemini = getClient();

  if (!gemini) {
    return { text: templateNarrative({ companyName, loanAmount, decisionResult }), modelUsed: 'template-fallback', tokensUsed: 0 };
  }

  const prompt = buildNarrativePrompt({ companyName, loanAmount, decisionResult });

  try {
    const start = Date.now();
    const response = await gemini.models.generateContent({
      model: env.geminiModel,
      contents: prompt,
    });
    const text = response.text ?? templateNarrative({ companyName, loanAmount, decisionResult });
    return {
      text,
      modelUsed: env.geminiModel,
      tokensUsed: (response.usageMetadata?.promptTokenCount ?? 0) + (response.usageMetadata?.candidatesTokenCount ?? 0),
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    logger.warn({ err }, 'LLM narrative generation failed — falling back to template narrative');
    return { text: templateNarrative({ companyName, loanAmount, decisionResult }), modelUsed: 'template-fallback (llm error)', tokensUsed: 0 };
  }
}

function buildNarrativePrompt({ companyName, loanAmount, decisionResult }) {
  return `You are a credit analyst assistant. A DETERMINISTIC scoring engine has already produced the lending decision below for ${companyName}, evaluating a requested working-capital facility of ₹${loanAmount} crore. Your job is ONLY to explain this decision clearly in plain English for a human credit analyst — you must NOT change, second-guess, or contradict the decision or confidence score. Cite the specific signals and metrics given. Be concise (200-300 words), structured, and honest about the uncertainty.

DECISION: ${decisionResult.decision}
OVERALL CONFIDENCE: ${decisionResult.overallConfidence}
COMPOSITE SCORE (0-100): ${decisionResult.compositeScore}

SIGNALS DETECTED:
${decisionResult.signals.map((s) => `- [${s.direction.toUpperCase()}/${s.severity}] ${s.key}: ${s.description}`).join('\n')}

SCORE BREAKDOWN:
${JSON.stringify(decisionResult.scoreBreakdown, null, 2)}

Write the analyst-facing explanation now.`;
}

/** Deterministic, evidence-grounded narrative used when no LLM key is configured. */
function templateNarrative({ companyName, loanAmount, decisionResult }) {
  const { decision, overallConfidence, compositeScore, signals, scoreBreakdown } = decisionResult;
  const riskSignals = signals.filter((s) => s.direction === 'risk');
  const oppSignals = signals.filter((s) => s.direction === 'opportunity');

  const lines = [
    `Recommendation for ${companyName} — requested facility ₹${loanAmount} crore: ${decision.replace(/_/g, ' ')} (composite score ${compositeScore}/100, confidence ${(overallConfidence * 100).toFixed(0)}%).`,
    '',
    riskSignals.length
      ? `Key risk signals (${riskSignals.length}): ${riskSignals.map((s) => s.key.replace(/_/g, ' ')).join('; ')}.`
      : 'No high-severity risk signals were detected.',
    oppSignals.length ? `Offsetting factors: ${oppSignals.map((s) => s.key.replace(/_/g, ' ')).join('; ')}.` : '',
    '',
    `Leverage sub-score: ${scoreBreakdown.leverage.score}/100. Cash-conversion/liquidity sub-score: ${scoreBreakdown.liquidityAndCash.score}/100. Debt-service coverage sub-score for this specific facility size: ${scoreBreakdown.dscr.score}/100.`,
    scoreBreakdown.dataQuality.penalty > 0
      ? `Confidence was reduced by ${(scoreBreakdown.dataQuality.penalty * 100).toFixed(0)} points due to data-quality factors (open discrepancies and/or a low-confidence latest reporting period) — treat the latest period's figures as provisional until confirmed against the primary filing.`
      : '',
    scoreBreakdown.overrideNotes?.length ? `Note: ${scoreBreakdown.overrideNotes.join(' ')}` : '',
  ];

  return lines.filter(Boolean).join('\n');
}

export { getClient, getClient as _getClientForTesting };
