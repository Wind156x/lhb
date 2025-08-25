
import React from 'react';
import { ValidationType } from '../types';

interface ValidationProps {
    message: string;
    type: ValidationType;
}

const Validation: React.FC<ValidationProps> = ({ message, type }) => {
    const baseClasses = "border rounded-lg p-3 mb-4 flex items-center gap-2 text-black";
    const typeClasses: Record<ValidationType, string> = {
        info: "bg-blue-50 border-blue-200",
        success: "bg-green-50 border-green-200",
        warning: "bg-yellow-50 border-yellow-200",
        error: "bg-red-50 border-red-200",
    };
    const icon: Record<ValidationType, string> = {
        info: "ℹ️",
        success: "✅",
        warning: "⚠️",
        error: "❌",
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <span role="img" aria-label={type}>{icon[type]}</span>
            <span className="text-sm font-medium">{message}</span>
        </div>
    );
};

export default Validation;