
import React from 'react';
import { Problem, Columns, AnswerType, ProblemSpacing } from '../types';
import { formatNumberSpacing } from '../lib/problemUtils';

interface ProblemItemProps {
    problem: Problem;
    answerType: AnswerType;
    numberSpacing: boolean;
    problemSpacing: ProblemSpacing;
    workingLines: number;
    hideEqualsPlaceholder: boolean;
    showAnswerKey: boolean;
}

const ProblemItem: React.FC<ProblemItemProps> = ({ problem, answerType, numberSpacing, problemSpacing, workingLines, hideEqualsPlaceholder, showAnswerKey }) => {
    const choices = problem.choices || [];
    const thaiLabels = ['ก', 'ข', 'ค', 'ง'];
    const itemColor = problem.isCustom ? 'bg-black' : 'bg-blue-600';
    
    const spacingClasses: Record<ProblemSpacing, string> = {
        small: 'mb-3',
        medium: 'mb-6',
        large: 'mb-9',
    };

    const renderProblemText = () => {
        let text = problem.problem;
        const placeholderRegex = /\s*=\s*____________\s*$/;

        if (showAnswerKey && problem.answer !== null) {
            const formattedAnswer = numberSpacing ? formatNumberSpacing(String(problem.answer)) : String(problem.answer);
            if (text.includes('____________')) {
                const parts = text.split('____________');
                return (
                    <>
                        {parts[0]}
                        <span className="font-bold text-blue-600">{formattedAnswer}</span>
                        {parts[1]}
                    </>
                );
            }
             if (!text.includes('=')) {
                return <>{text.replace(placeholderRegex, '')} = <span className="font-bold text-blue-600">{formattedAnswer}</span></>;
            }
        }

        if (hideEqualsPlaceholder && placeholderRegex.test(text)) {
            text = text.replace(placeholderRegex, '');
        }
        return <>{text}</>;
    };


    return (
        <div className={`problem-item flex items-start p-4 border rounded-lg bg-white ${spacingClasses[problemSpacing]}`}>
            <div className="flex items-start gap-3 w-full">
                <span className={`${itemColor} text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1`}>
                    {problem.number}
                </span>
                <div className="flex-grow">
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                         <span className="text-lg font-mono text-black">
                            {renderProblemText()}
                        </span>

                        {answerType === 'choices' && (
                            <div className="flex gap-x-4 gap-y-2 flex-wrap">
                                {choices.map((choice, i) => {
                                    const formattedChoice = numberSpacing ? formatNumberSpacing(String(choice)) : choice;
                                    const isCorrect = showAnswerKey && choice === problem.answer;
                                    return (
                                        <label key={i} className={`flex items-center gap-1.5 cursor-pointer p-1 rounded ${isCorrect ? 'bg-green-100' : ''}`}>
                                            <input 
                                                type="radio" 
                                                name={`q${problem.number}`} 
                                                value={choice} 
                                                className="text-blue-600 focus:ring-blue-500"
                                                checked={isCorrect}
                                                readOnly={showAnswerKey}
                                            />
                                            <span className={`text-base font-mono text-black ${isCorrect ? 'font-bold text-green-800' : ''}`}>
                                                {thaiLabels[i]}) {formattedChoice}
                                            </span>
                                        </label>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                     {answerType === 'working' && (
                         <div className="mt-4 w-full">
                            {showAnswerKey ? (
                                problem.solution ? (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-black whitespace-pre-wrap font-mono">
                                        <p className="font-sans font-bold mb-2 text-green-800">วิธีทำ:</p>
                                        {problem.solution}
                                    </div>
                                ) : (
                                    <p className="font-bold text-black">คำตอบ: {numberSpacing ? formatNumberSpacing(String(problem.answer)) : problem.answer}</p>
                                )
                            ) : (
                                <div className="space-y-5 pb-2">
                                    {Array.from({ length: workingLines > 0 ? workingLines : 1 }).map((_, i) => (
                                        <div key={i} className="border-b border-gray-400"></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


interface WorksheetProps {
    title: string;
    columns: Columns;
    problems: Problem[];
    answerType: AnswerType;
    numberSpacing: boolean;
    problemSpacing: ProblemSpacing;
    workingLines: number;
    hideEqualsPlaceholder: boolean;
    showAnswerKey: boolean;
}

const Worksheet: React.FC<WorksheetProps> = ({ title, columns, problems, answerType, numberSpacing, problemSpacing, workingLines, hideEqualsPlaceholder, showAnswerKey }) => {
    const columnClasses: Record<Columns, string> = {
        '1': 'columns-1',
        '2': 'md:columns-2',
        '3': 'md:columns-2 lg:columns-3'
    };
    
    return (
        <div className="max-w-4xl mx-auto w-full">
            <main className="bg-white rounded-lg shadow-lg border min-h-[842px] print:shadow-none print:border-none" id="worksheet">
                <header className="border-b p-6">
                    <h2 className="text-2xl font-bold text-center text-black mb-6">{title}</h2>
                    <div className="space-y-3 text-sm text-black">
                        <div className="flex items-center gap-3">
                            <span className="font-medium">ชื่อ</span>
                            <div className="flex-1 border-b border-gray-400"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8">
                            <div className="flex items-center gap-3">
                                <span className="font-medium">ชั้น</span>
                                <div className="flex-1 border-b border-gray-400"></div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-medium">เลขที่</span>
                                <div className="flex-1 border-b border-gray-400"></div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-6">
                    {problems.length > 0 ? (
                        <div className={`gap-x-8 ${columnClasses[columns]}`}>
                            {problems.map(p => (
                                <ProblemItem 
                                    key={p.number} 
                                    problem={p} 
                                    answerType={answerType} 
                                    numberSpacing={numberSpacing} 
                                    problemSpacing={problemSpacing} 
                                    workingLines={workingLines} 
                                    hideEqualsPlaceholder={hideEqualsPlaceholder}
                                    showAnswerKey={showAnswerKey}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-black col-span-full py-32">
                            <div className="text-5xl mb-4">📄</div>
                            <h3 className="text-xl font-semibold">เริ่มต้นสร้างใบงานของคุณ</h3>
                            <p className="mt-2 text-black">ตั้งค่าในแผงควบคุมด้านซ้ายเพื่อเริ่มสร้างใบงาน</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Worksheet;
