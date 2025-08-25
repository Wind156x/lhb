
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import Sidebar from './Sidebar';
import Worksheet from './Worksheet';
import CustomProblemModal from './CustomProblemModal';
import Validation from './Validation';
import { Settings, Problem, ValidationMessage, CustomProblem } from '../types';
import { generateProblemFromFormula, shuffleArray, generateChoices } from '../lib/problemUtils';

const App: React.FC = () => {
    const [settings, setSettings] = useState<Settings>({
        title: 'แบบฝึกหัดคณิตศาสตร์',
        answerType: 'blank',
        columns: '2',
        formulas: [
            {
                id: `formula-${Date.now()}`,
                formula: 'a + b = {c}',
                count: 20,
            },
        ],
        variableRanges: { a: { min: 1, max: 99 }, b: { min: 1, max: 99 } },
        numberSpacing: false,
        problemSpacing: 'medium',
        workingLines: 4,
        hideEqualsPlaceholder: false,
    });
    const [problems, setProblems] = useState<Problem[]>([]);
    const [isCustomModalOpen, setCustomModalOpen] = useState(false);
    const [validation, setValidation] = useState<ValidationMessage | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAnswerKey, setShowAnswerKey] = useState(false);
    const [isFetchingSolutions, setIsFetchingSolutions] = useState(false);


    const showValidation = (text: string, type: ValidationMessage['type']) => {
        setValidation({ text, type });
    };

    useEffect(() => {
        if (validation) {
            const timer = setTimeout(() => setValidation(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [validation]);

    const handleGenerateWorksheet = useCallback(() => {
        setIsGenerating(true);
        setShowAnswerKey(false); // Hide answer key when regenerating
        const totalCount = settings.formulas.reduce((sum, f) => sum + f.count, 0);
        if (totalCount < 1 || totalCount > 100) {
            showValidation('จำนวนข้อทั้งหมดต้องอยู่ระหว่าง 1-100', 'error');
            setIsGenerating(false);
            return;
        }

        if (settings.formulas.some(f => !f.formula)) {
            showValidation('กรุณากรอกสูตรโจทย์ให้ครบทุกช่อง', 'error');
            setIsGenerating(false);
            return;
        }

        try {
            let allProblemsRaw: { problem: string; answer: number | null }[] = [];
            settings.formulas.forEach(f => {
                if (f.count > 0 && f.formula) {
                    const generated = Array.from({ length: f.count }, () => {
                        return generateProblemFromFormula(f.formula, settings.variableRanges, { numberSpacing: settings.numberSpacing });
                    });
                    allProblemsRaw.push(...generated);
                }
            });

            const shuffledProblems = shuffleArray(allProblemsRaw);

            const newProblems: Problem[] = shuffledProblems.map((p, i) => {
                const problem: Problem = { ...p, number: i + 1 };
                if (settings.answerType === 'choices' && p.answer !== null) {
                    problem.choices = generateChoices(p.answer);
                }
                return problem;
            });

            setProblems(newProblems);
            showValidation(`สร้างโจทย์สำเร็จ ${newProblems.length} ข้อ`, 'success');

        } catch (error) {
            console.error("Error generating worksheet:", error);
            const errorMessage = error instanceof Error ? error.message : 'ไม่สามารถสร้างโจทย์ได้ เกิดข้อผิดพลาด';
            showValidation(errorMessage, 'error');
        } finally {
            setIsGenerating(false);
        }
    }, [settings]);

    // Generate worksheet on initial load
    useEffect(() => {
        handleGenerateWorksheet();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const handleAddCustomProblems = (customProblems: CustomProblem[]) => {
        const startNumber = problems.length + 1;
        
        const newProblems: Problem[] = customProblems.map((p, i) => {
            const problem: Problem = {
                problem: p.display,
                answer: p.answer,
                number: startNumber + i,
                isCustom: true
            };
            if (settings.answerType === 'choices' && p.answer !== null) {
                problem.choices = generateChoices(p.answer);
            }
            return problem;
        });

        setProblems(prev => [...prev, ...newProblems]);
        setCustomModalOpen(false);
        showValidation(`เพิ่มโจทย์สำเร็จ ${newProblems.length} ข้อ`, 'success');
    };

    const fetchSolutions = useCallback(async () => {
        if (isFetchingSolutions || !problems.some(p => !p.solution)) {
            return;
        }

        setIsFetchingSolutions(true);
        showValidation('กำลังสร้างเฉลยวิธีทำ...', 'info');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const updatedProblems = await Promise.all(
                problems.map(async (p) => {
                    if (p.solution) {
                        return p;
                    }

                    // Check for simple addition/subtraction to format vertically
                    const simpleMathRegex = /^\s*(\d+(?:\.\d+)?)\s*([+-])\s*(\d+(?:\.\d+)?)\s*=\s*____________\s*$/;
                    const match = p.problem.trim().match(simpleMathRegex);

                    if (match && p.answer !== null) {
                        const num1_str = match[1];
                        const operator = match[2];
                        const num2_str = match[3];
                        const answer_str = String(p.answer);

                        const splitNumber = (s: string) => {
                            const parts = s.split('.');
                            return { intPart: parts[0] || '0', fracPart: parts[1] || '' };
                        };

                        const s1 = splitNumber(num1_str);
                        const s2 = splitNumber(num2_str);
                        const sAns = splitNumber(answer_str);

                        const maxIntLength = Math.max(s1.intPart.length, s2.intPart.length, sAns.intPart.length);
                        const maxFracLength = Math.max(s1.fracPart.length, s2.fracPart.length, sAns.fracPart.length);

                        const hasDecimal = maxFracLength > 0;

                        const formatNumber = (parts: { intPart: string, fracPart: string }) => {
                            const intPadded = parts.intPart.padStart(maxIntLength, ' ');
                            if (!hasDecimal) {
                                return intPadded;
                            }
                            const fracPadded = parts.fracPart.padEnd(maxFracLength, '0');
                            return `${intPadded}.${fracPadded}`;
                        };
                        
                        const f_line1 = formatNumber(s1);
                        const f_line2 = formatNumber(s2);
                        const f_lineAns = formatNumber(sAns);

                        const displayLine2 = `${f_line2}${operator}`;
                        const displayLineAns = `${f_lineAns}=`;
                        
                        const maxLength = Math.max(f_line1.length, displayLine2.length, displayLineAns.length);

                        const paddedLine1 = f_line1.padStart(maxLength, ' ');
                        const paddedLine2 = displayLine2.padStart(maxLength, ' ');
                        const line3 = '—'.repeat(maxLength);
                        const paddedLine4 = displayLineAns.padStart(maxLength, ' ');

                        const solution = [
                            paddedLine1,
                            paddedLine2,
                            line3,
                            paddedLine4
                        ].join('\n');
                        
                        return { ...p, solution };
                    } else {
                        // Fallback to AI for other problems
                        const prompt = `แก้โจทย์คณิตศาสตร์ต่อไปนี้และแสดงวิธีทำทีละขั้นตอนอย่างละเอียดสำหรับนักเรียน: "${p.problem.replace(/____________/g, '?')}"`;
                        const response = await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: prompt,
                        });
                        return { ...p, solution: response.text };
                    }
                })
            );
            setProblems(updatedProblems);
            showValidation('สร้างเฉลยวิธีทำสำเร็จ', 'success');
        } catch (error) {
            console.error("Error fetching solutions:", error);
            showValidation('ไม่สามารถสร้างเฉลยวิธีทำได้', 'error');
        } finally {
            setIsFetchingSolutions(false);
        }
    }, [problems, isFetchingSolutions]);

    useEffect(() => {
        const shouldFetch = showAnswerKey && settings.answerType === 'working' && problems.some(p => !p.solution);
        if (shouldFetch) {
            fetchSolutions();
        }
    }, [showAnswerKey, settings.answerType, problems, fetchSolutions]);
    
     const handleShowAnswers = () => {
        if (problems.length === 0) {
            showValidation('ไม่มีโจทย์ที่จะแสดงเฉลย กรุณาสร้างโจทย์ก่อน', 'error');
            return;
        }
        setShowAnswerKey(prev => !prev);
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen">
            <Sidebar
                settings={settings}
                onSettingsChange={setSettings}
                onGenerate={handleGenerateWorksheet}
                onShowAnswers={handleShowAnswers}
                onShowCustomInput={() => setCustomModalOpen(true)}
                isGenerating={isGenerating}
                isFetchingSolutions={isFetchingSolutions}
                showAnswerKey={showAnswerKey}
            />
            <div className="flex-1 p-4 md:p-8 overflow-auto">
                 {validation && (
                    <div className="max-w-4xl mx-auto mb-4 no-print">
                        <Validation message={validation.text} type={validation.type} />
                    </div>
                )}
                <Worksheet
                    title={settings.title}
                    columns={settings.columns}
                    problems={problems}
                    answerType={settings.answerType}
                    numberSpacing={settings.numberSpacing}
                    problemSpacing={settings.problemSpacing}
                    workingLines={settings.workingLines}
                    hideEqualsPlaceholder={settings.hideEqualsPlaceholder}
                    showAnswerKey={showAnswerKey}
                />
            </div>

            <CustomProblemModal
                isOpen={isCustomModalOpen}
                onClose={() => setCustomModalOpen(false)}
                onAdd={handleAddCustomProblems}
            />
        </div>
    );
};

export default App;
