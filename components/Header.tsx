import React from 'react';
import { Settings } from '../types';

interface HeaderProps {
    settings: Settings;
    onSettingsChange: React.Dispatch<React.SetStateAction<Settings>>;
    onGenerate: () => void;
    onShowAnswers: () => void;
    onShowCustomInput: () => void;
    isGenerating: boolean;
}

const Header: React.FC<HeaderProps> = ({ settings, onSettingsChange, onGenerate, onShowAnswers, onShowCustomInput, isGenerating }) => {
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type } = e.target;
        onSettingsChange(prev => ({
            ...prev,
            [id]: type === 'number' ? parseInt(value, 10) : value
        }));
    };
    
    const totalCount = settings.formulas.reduce((sum, f) => sum + (f.count || 0), 0);

    return (
        <header className="bg-white shadow-sm border-b no-print">
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <h1 className="text-2xl font-bold text-black">🧮 Math Worksheet Creator</h1>
                    <div className="flex items-center gap-3 flex-wrap">
                        <input
                            type="text"
                            id="title"
                            placeholder="ชื่อใบงาน"
                            value={settings.title}
                            onChange={handleInputChange}
                            className="px-3 py-2 border rounded-lg text-sm w-48"
                        />
                        <input
                            type="number"
                            id="count"
                            placeholder="จำนวนข้อ"
                            value={totalCount}
                            readOnly
                            className="px-3 py-2 border rounded-lg text-sm w-20 text-center bg-slate-100 cursor-not-allowed"
                        />
                        <button 
                            onClick={onGenerate} 
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:bg-blue-400 disabled:cursor-not-allowed"
                            disabled={isGenerating}
                        >
                            {isGenerating ? 'กำลังสร้าง...' : 'สร้างโจทย์'}
                        </button>
                        <button onClick={onShowAnswers} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                            เฉลย
                        </button>
                        <button onClick={onShowCustomInput} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                            เพิ่มโจทย์
                        </button>
                        <button onClick={() => window.print()} className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 text-sm font-medium">
                            พิมพ์
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;