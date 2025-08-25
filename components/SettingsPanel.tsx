import React from 'react';
import { Settings } from '../types';

interface SettingsPanelProps {
    settings: Settings;
    onSettingsChange: React.Dispatch<React.SetStateAction<Settings>>;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange }) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { id, value } = e.target;
        onSettingsChange(prev => ({ ...prev, [id]: value }));
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-4 no-print">
            <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="answerType" className="block text-sm font-medium text-gray-800 mb-2">รูปแบบคำตอบ</label>
                        <select id="answerType" value={settings.answerType} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="blank">ช่องว่าง</option>
                            <option value="choices">เลือกตอบ</option>
                            <option value="working">พื้นที่ทำ</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="columns" className="block text-sm font-medium text-gray-800 mb-2">จำนวนคอลัมน์</label>
                        <select id="columns" value={settings.columns} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="1">1 คอลัมน์</option>
                            <option value="2">2 คอลัมน์</option>
                            <option value="3">3 คอลัมน์</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;