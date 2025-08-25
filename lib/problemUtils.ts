
import { CustomProblem } from '../types';

export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function evaluateExpression(expr: string): number {
    expr = expr.replace(/×/g, '*').replace(/÷/g, '/');
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
        throw new Error('Invalid expression');
    }
    const result = new Function(`"use strict"; return (${expr})`)();
    if (typeof result !== 'number') {
        throw new Error('Expression did not evaluate to a number');
    }
    // Round to 4 decimal places if it's a float
    if (result % 1 !== 0) {
        return parseFloat(result.toFixed(4));
    }
    return result;
}

export function generateChoices(correct: number): number[] {
    const choices = new Set<number>([correct]);
    const isFloat = correct % 1 !== 0;

    while (choices.size < 4) {
        let offset: number;
        if (isFloat) {
            offset = (Math.random() - 0.5) * 2; // Offset between -1 and 1
        } else {
            offset = randomInt(-5, 5) || 1;
        }
        
        let wrong = correct + offset;
        if(isFloat) wrong = parseFloat(wrong.toFixed(1));


        if (wrong >= 0 && wrong !== correct) {
            choices.add(wrong);
        }
    }
    return shuffleArray(Array.from(choices));
}

export function parseVariables(formula: string): string[] {
    // Exclude content within {} from variable parsing
    const formulaWithoutPlaceholder = formula.replace(/\{[^}]+\}/g, '');
    // Matches alphabetic identifiers, e.g., 'a', 'b', 'xx', 'num1'
    const matches = formulaWithoutPlaceholder.match(/[a-zA-Z][a-zA-Z0-9]*/g) || [];
    return [...new Set(matches)];
}

export function formatNumberSpacing(text: string): string {
    if (!text) return '';
    // Use a callback with replace to apply spacing only to numbers
    return text.replace(/\d+/g, (match) => match.split('').join(' '));
}

export function generateProblemFromFormula(
    formula: string,
    ranges: Record<string, { min: number; max: number; }>,
    options: { numberSpacing: boolean; }
): { problem: string; answer: number | null } {
    if (!formula) {
        return { problem: '', answer: null };
    }

    const { numberSpacing } = options;
    const variables = parseVariables(formula);
    const valueMap = new Map<string, number>();
    variables.forEach(v => {
        const range = ranges[v] || { min: 0, max: 9 };
        valueMap.set(v, randomInt(range.min, range.max));
    });

    const substitute = (str: string): string => {
        let result = str;
        // Sort variables by length descending to handle cases like 'xx' and 'x' correctly.
        const sortedVars = Array.from(valueMap.keys()).sort((a, b) => b.length - a.length);
        sortedVars.forEach(v => {
            // Use a global replacement without word boundaries to allow for patterns like '2x' or '0.0y'
            const regex = new RegExp(v, 'g');
            result = result.replace(regex, String(valueMap.get(v)));
        });
        return result;
    };

    const transformForEval = (expr: string): string => {
        let result = expr;
        // Mixed numbers: a@b\c -> (a+b/c)
        result = result.replace(/(\S+)@(\S+)\\(\S+)/g, '($1+$2/$3)');
        // Fractions: a\b -> (a/b)
        result = result.replace(/(\S+)\\(\S+)/g, '($1/$2)');
        return result;
    };
    
    // Determine answer expression before transformations
    let answerExpression = '';
    const placeholderRegexForEval = /\{[^}]+\}/;
    if (formula.includes('=')) {
        const parts = formula.split('=');
        const blankSideIndex = parts.findIndex(p => p.includes('____') || p.includes('?') || placeholderRegexForEval.test(p));
        if (blankSideIndex !== -1) {
            answerExpression = blankSideIndex === 0 ? parts[1].trim() : parts[0].trim();
        }
    }
    
    // Calculate final answer
    let finalAnswer: number | null = null;
    if (answerExpression) {
        try {
            const transformedAnswerExpr = transformForEval(answerExpression);
            const substitutedAnswerExpr = substitute(transformedAnswerExpr);
            finalAnswer = evaluateExpression(substitutedAnswerExpr);
        } catch {
            finalAnswer = null;
        }
    }

    // Create the final display string
    let problemString = formula;
    
    const placeholderRegex = /\{[^}]+\}/;
    
    // Always replace placeholder with a blank line for display. Hiding is handled in the UI.
    const BLANK_PLACEHOLDER = '____________';
    problemString = problemString.replace(placeholderRegex, BLANK_PLACEHOLDER);


    // Handle expressions within [ ]
    problemString = problemString.replace(/\[([^\]]+)\]/g, (_, expression) => {
        try {
            const transformedExpr = transformForEval(expression);
            const substitutedExpr = substitute(transformedExpr);
            const evaluated = String(evaluateExpression(substitutedExpr));
            return numberSpacing ? formatNumberSpacing(evaluated) : evaluated;
        } catch {
            return `[${expression}]`; // Return original if error
        }
    });
    
    problemString = substitute(problemString);

    // Final display transformations
    problemString = problemString.replace(/\*/g, '×').replace(/\//g, '÷');
    // a@b\c -> a b/c
    problemString = problemString.replace(/(\S+)@(\S+)\\(\S+)/g, '$1 $2/$3');
    // a\b -> a/b
    problemString = problemString.replace(/(\S+)\\(\S+)/g, '$1/$2');
    
    if (numberSpacing) {
        problemString = formatNumberSpacing(problemString);
    }

    return { problem: problemString, answer: finalAnswer };
}


export function parseCustomProblems(input: string): CustomProblem[] {
    const lines = input.split('\n').filter(line => line.trim());
    return lines.map(line => {
        line = line.trim();
        let display = line;
        let answer: number | null = null;

        if (line.includes('=')) {
            const parts = line.split('=');
            const leftSide = parts[0].trim();
            const rightSide = parts[1].trim();

            if (rightSide === '____' || rightSide === '?' || rightSide === '' || /\{.*\}/.test(rightSide)) {
                try {
                    answer = evaluateExpression(leftSide);
                    display = `${leftSide} = ____________`;
                } catch {
                    // ignore
                }
            }
        }
        return { original: line, display, answer };
    });
}