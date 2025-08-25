
import React, { useEffect, useMemo } from 'react';
import { Settings } from '../types';
import { parseVariables } from '../lib/problemUtils';

interface SidebarProps {
    settings: Settings;
    onSettingsChange: React.Dispatch<React.SetStateAction<Settings>>;
    onGenerate: () => void;
    onShowAnswers: () => void;
    onShowCustomInput: () => void;
    isGenerating: boolean;
    isFetchingSolutions?: boolean;
    showAnswerKey?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ settings, onSettingsChange, onGenerate, onShowAnswers, onShowCustomInput, isGenerating, isFetchingSolutions, showAnswerKey }) => {

    const allVariables = useMemo(() => {
        const all = settings.formulas.flatMap(f => parseVariables(f.formula));
        return [...new Set(all)].sort();
    }, [settings.formulas]);
    
    // Effect to auto-populate variable ranges when new variables are detected
    useEffect(() => {
        let needsUpdate = false;
        const newRanges = { ...settings.variableRanges };

        allVariables.forEach(v => {
            if (!newRanges[v]) {
                newRanges[v] = { min: 0, max: 9 };
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            onSettingsChange(prev => ({ ...prev, variableRanges: newRanges }));
        }
    }, [allVariables, settings.variableRanges, onSettingsChange]);

    const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
             onSettingsChange(prev => ({ ...prev, [id]: checked }));
        } else if (type === 'number') {
            onSettingsChange(prev => ({ ...prev, [id]: parseInt(value, 10) || 1 }));
        } else {
             onSettingsChange(prev => ({ ...prev, [id]: value }));
        }
    };

    const handleAddFormula = () => {
        onSettingsChange(prev => ({
            ...prev,
            formulas: [
                ...prev.formulas,
                {
                    id: `formula-${Date.now()}`,
                    formula: '',
                    count: 10,
                }
            ]
        }));
    };

    const handleRemoveFormula = (id: string) => {
        onSettingsChange(prev => ({
            ...prev,
            formulas: prev.formulas.length > 1 ? prev.formulas.filter(f => f.id !== id) : prev.formulas
        }));
    };

    const handleFormulaSettingChange = (id: string, field: 'formula' | 'count', value: string | number) => {
        onSettingsChange(prev => ({
            ...prev,
            formulas: prev.formulas.map(f =>
                f.id === id ? { ...f, [field]: field === 'count' ? parseInt(String(value), 10) || 0 : value } : f
            )
        }));
    };
    
    const handleRangeChange = (variable: string, field: 'min' | 'max', value: string) => {
        onSettingsChange(prev => ({
            ...prev,
            variableRanges: {
                ...prev.variableRanges,
                [variable]: {
                    ...(prev.variableRanges[variable] || { min: 0, max: 9 }),
                    [field]: parseInt(value, 10) || 0,
                },
            },
        }));
    };
    
    const totalCount = settings.formulas.reduce((sum, f) => sum + (f.count || 0), 0);

    const SettingSelect: React.FC<{ id: keyof Settings; label: string; children: React.ReactNode }> = ({ id, label, children }) => (
         <div>
            <label htmlFor={id} className="block text-sm font-medium text-black mb-1.5">{label}</label>
            <select id={id} value={settings[id] as string} onChange={handleSettingChange} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 text-black">
                {children}
            </select>
        </div>
    );
    
    return (
        <aside className="w-full md:w-96 bg-white border-r border-slate-200 p-6 no-print flex-shrink-0">
            <div className="space-y-6">
                <h1 className="text-xl font-bold text-black">🧮 ระบบสร้างโจทย์คณิต</h1>

                <div className="space-y-4">
                    <h2 className="text-base font-semibold text-black border-b pb-2">ตั้งค่าใบงาน</h2>
                     <div>
                        <label htmlFor="title" className="block text-sm font-medium text-black mb-1.5">ชื่อใบงาน</label>
                        <input
                            type="text"
                            id="title"
                            value={settings.title}
                            onChange={handleSettingChange}
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 text-black placeholder-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-black mb-1.5">จำนวนข้อทั้งหมด</label>
                        <input
                            type="text"
                            value={`${totalCount} ข้อ`}
                            readOnly
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-200 text-black cursor-default text-center font-medium"
                        />
                     </div>
                </div>

                <div className="space-y-4">
                     <h2 className="text-base font-semibold text-black border-b pb-2">รูปแบบโจทย์</h2>
                     {settings.formulas.map((f, index) => {
                         return (
                            <div key={f.id} className="p-4 border rounded-lg bg-slate-50/50 space-y-4 relative">
                                {settings.formulas.length > 1 && (
                                    <button onClick={() => handleRemoveFormula(f.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 font-bold text-xl leading-none" aria-label="ลบสูตร">&times;</button>
                                )}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <label htmlFor={`formula-${f.id}`} className="block text-xs font-medium text-black mb-1.5">สูตรที่ {index + 1}</label>
                                        <textarea
                                            id={`formula-${f.id}`}
                                            value={f.formula}
                                            onChange={e => handleFormulaSettingChange(f.id, 'formula', e.target.value)}
                                            rows={2}
                                            placeholder="a + b = {c}"
                                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-black font-mono resize-vertical placeholder-black"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`count-${f.id}`} className="block text-xs font-medium text-black mb-1.5">จำนวน</label>
                                        <input
                                            type="number"
                                            id={`count-${f.id}`}
                                            value={f.count}
                                            onChange={e => handleFormulaSettingChange(f.id, 'count', e.target.value)}
                                            min="0"
                                            className="w-full px-2 py-2 border rounded-lg text-sm bg-white text-black placeholder-black text-center"
                                        />
                                    </div>
                                </div>
                            </div>
                         );
                     })}
                     <button onClick={handleAddFormula} className="w-full bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 text-sm font-medium transition-colors">
                        + เพิ่มสูตรโจทย์
                    </button>
                </div>
                 
                {allVariables.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-base font-semibold text-black border-b pb-2">กำหนดช่วงตัวแปรทั้งหมด</h2>
                        <div className="space-y-3 p-4 border rounded-lg bg-slate-50/50">
                            {allVariables.map(v => (
                                <div key={v} className="grid grid-cols-3 gap-2 items-center">
                                    <label className="text-sm font-medium text-black col-span-1 truncate" title={`ตัวแปร "${v}"`}>{`"${v}"`}</label>
                                    <div className="col-span-2 grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            value={settings.variableRanges[v]?.min ?? ''}
                                            onChange={e => handleRangeChange(v, 'min', e.target.value)}
                                            className="w-full px-2 py-2 border rounded-lg text-sm bg-white text-black placeholder-black text-center"
                                            placeholder="น้อยที่สุด"
                                            aria-label={`Min for ${v}`}
                                        />
                                        <input
                                            type="number"
                                            value={settings.variableRanges[v]?.max ?? ''}
                                            onChange={e => handleRangeChange(v, 'max', e.target.value)}
                                            className="w-full px-2 py-2 border rounded-lg text-sm bg-white text-black placeholder-black text-center"
                                            placeholder="มากที่สุด"
                                            aria-label={`Max for ${v}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="space-y-4">
                     <h2 className="text-base font-semibold text-black border-b pb-2">รูปแบบการแสดงผล</h2>
                     <SettingSelect id="answerType" label="รูปแบบคำตอบ">
                        <option value="blank">ช่องว่าง</option>
                        <option value="choices">ก ข ค ง</option>
                        <option value="working">พื้นที่แสดงวิธีทำ</option>
                    </SettingSelect>
                    {settings.answerType === 'working' && (
                        <div>
                            <label htmlFor="workingLines" className="block text-sm font-medium text-black mb-1.5">จำนวนบรรทัด (วิธีทำ)</label>
                            <input
                                type="number"
                                id="workingLines"
                                value={settings.workingLines}
                                onChange={handleSettingChange}
                                min="1"
                                max="20"
                                className="w-full px-2 py-2 border rounded-lg text-sm bg-slate-50 text-black text-center"
                            />
                        </div>
                    )}
                    <SettingSelect id="columns" label="จำนวนคอลัมน์">
                        <option value="1">1 คอลัมน์</option>
                        <option value="2">2 คอลัมน์</option>
                        <option value="3">3 คอลัมน์</option>
                    </SettingSelect>
                    <SettingSelect id="problemSpacing" label="ระยะห่างกรอบโจทย์">
                        <option value="small">น้อย</option>
                        <option value="medium">ปานกลาง</option>
                        <option value="large">มาก</option>
                    </SettingSelect>
                     <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                         <label htmlFor="hideEqualsPlaceholder" className="text-sm font-medium text-black select-none">ซ่อนเครื่องหมาย = {'{c}'}</label>
                         <input
                            type="checkbox"
                            id="hideEqualsPlaceholder"
                            checked={settings.hideEqualsPlaceholder}
                            onChange={handleSettingChange}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                         <label htmlFor="numberSpacing" className="text-sm font-medium text-black select-none">เว้นวรรคตัวเลข (99 → 9 9)</label>
                         <input
                            type="checkbox"
                            id="numberSpacing"
                            checked={settings.numberSpacing}
                            onChange={handleSettingChange}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                     <button
                        onClick={onGenerate}
                        disabled={isGenerating}
                        className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-bold transition-colors disabled:bg-blue-400 disabled:cursor-wait"
                    >
                        {isGenerating ? 'กำลังสร้าง...' : 'สร้างโจทย์ใหม่'}
                    </button>
                     <div className="grid grid-cols-2 gap-3">
                        <button onClick={onShowCustomInput} className="w-full bg-slate-200 text-black px-4 py-2 rounded-lg hover:bg-slate-300 text-sm font-medium">
                            เพิ่มโจทย์
                        </button>
                        <button 
                            onClick={onShowAnswers} 
                            className="w-full bg-slate-200 text-black px-4 py-2 rounded-lg hover:bg-slate-300 text-sm font-medium disabled:opacity-50"
                            disabled={isFetchingSolutions}
                        >
                            {isFetchingSolutions ? 'รอสักครู่...' : showAnswerKey ? 'ซ่อนเฉลย' : 'เฉลย'}
                        </button>
                    </div>
                    <button onClick={() => window.print()} className="w-full bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 text-sm font-medium">
                        พิมพ์
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;