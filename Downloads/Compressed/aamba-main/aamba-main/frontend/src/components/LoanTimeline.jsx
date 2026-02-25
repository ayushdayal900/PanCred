import React from 'react';
import { FiCheckCircle, FiCircle, FiLoader } from 'react-icons/fi';

const LoanTimeline = ({ status }) => {
    const steps = [
        { id: 'Pending', label: 'Created', color: 'bg-slate-400' },
        { id: 'Funded', label: 'Funded', color: 'bg-blue-500' },
        { id: 'Repaid', label: 'Repaid', color: 'bg-emerald-500' }
    ];

    const currentStepIndex = steps.findIndex(s => s.id === status);

    return (
        <div className="relative flex justify-between items-center w-full py-4">
            {/* Background Line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-700 -translate-y-1/2 z-0"></div>

            {/* Active Progress Line */}
            <div
                className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500 -translate-y-1/2 z-0 transition-all duration-1000"
                style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            ></div>

            {steps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isActive
                                ? 'bg-fintech-dark border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                : 'bg-fintech-dark border-slate-600 text-slate-600'
                            }`}>
                            {isActive ? (
                                isCurrent && status !== 'Repaid' ? <FiLoader className="animate-spin" /> : <FiCheckCircle />
                            ) : (
                                <FiCircle />
                            )}
                        </div>
                        <span className={`absolute -bottom-6 text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 whitespace-nowrap ${isActive ? 'text-white' : 'text-slate-500'
                            }`}>
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default LoanTimeline;
