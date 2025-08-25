
import React, { useState } from 'react';
import { CustomProblem } from '../types';
import { parseCustomProblems } from '../lib/problemUtils';

interface CustomProblemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (problems: CustomProblem[]) => void;
}

const CustomProblemModal: React.FC<CustomProblemModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [inputText, setInputText] = useState('');
    const [previewProblems, setPreviewProblems] = useState<CustomProblem[]>([]);

    const handlePreview = () => {
        const parsed = parseCustomProblems(inputText);
        setPreviewProblems(parsed);
    };

    const handleAdd = () => {
        const parsed = parseCustomProblems(inputText);
        if (parsed.length > 0) {
            onAdd(parsed);
            setInputText('');
            setPreviewProblems([]);
        }
    };
    
    const handleClose = () => {
        setInputText('');
        setPreviewProblems([]);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print" onClick={handleClose}>
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold text-black">➕ เพิ่มโจทย์กำหนดเอง</h3>
                    <button onClick={handleClose} className="text-black hover:text-gray-700 text-2xl">&times;</button>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="customProblems" className="block text-sm font-medium mb-2 text-black">กรอกโจทย์ (หนึ่งบรรทัดต่อหนึ่งข้อ)</label>
                            <textarea
                                id="customProblems"
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                rows={8}
                                placeholder={"ตัวอย่าง:\n5 + 3 = ?\n12 - 7 = ____\n8 × 4 = {answer}"}
                                className="w-full px-3 py-2 border rounded-lg text-sm font-mono resize-vertical text-black placeholder-black"
                            ></textarea>
                            <p className="text-xs text-black mt-1">ใช้ ____, ?, หรือ {'{ }'} เป็นช่องคำตอบ</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleAdd} className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium">เพิ่มโจทย์</button>
                            <button onClick={handlePreview} className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium">ดูตัวอย่าง</button>
                            <button onClick={handleClose} className="flex-1 bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 font-medium">ยกเลิก</button>
                        </div>
                    </div>

                    {previewProblems.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-medium mb-3 text-black">ตัวอย่างโจทย์ที่จะเพิ่ม:</h4>
                            <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto space-y-2">
                                {previewProblems.map((p, i) => (
                                    <div key={i} className="p-2 bg-white rounded border">
                                        <span className="text-black font-bold">ข้อ {i + 1}:</span>
                                        <span className="font-mono ml-2 text-black">{p.display}</span>
                                        {p.answer !== null && <span className="text-black font-semibold ml-2">(เฉลย: {p.answer})</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomProblemModal;
