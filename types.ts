

export type AnswerType = 'blank' | 'choices' | 'working';
export type Columns = '1' | '2' | '3';
export type ValidationType = 'info' | 'success' | 'warning' | 'error';
export type ProblemSpacing = 'small' | 'medium' | 'large';

export interface FormulaSetting {
    id: string;
    formula: string;
    count: number;
}

export interface Settings {
    title: string;
    answerType: AnswerType;
    columns: Columns;
    formulas: FormulaSetting[];
    variableRanges: Record<string, { min: number; max: number; }>;
    numberSpacing: boolean;
    problemSpacing: ProblemSpacing;
    workingLines: number;
    hideEqualsPlaceholder: boolean;
}

export interface Problem {
    problem: string;
    answer: number | null;
    number: number;
    isCustom?: boolean;
    choices?: number[];
    solution?: string;
}

export interface Answer {
    problem: string;
    answer: number | null;
    number: number;
}

export interface ValidationMessage {
    text: string;
    type: ValidationType;
}

export interface CustomProblem {
    original: string;
    display: string;
    answer: number | null;
}