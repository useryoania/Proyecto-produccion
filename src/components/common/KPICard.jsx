import React from 'react';

/**
 * Reusable KPI Card Component (Tailwind Version)
 * Modern, shadows, glass-feel optional
 */
const KPICard = ({ title, value, subtext, style, className, tooltip, onClick, children }) => {
    return (
        <div
            className={`
        bg-white rounded-2xl border border-slate-100 p-6
        shadow-sm hover:shadow-card-hover transition-all duration-300
        flex flex-col justify-between
        ${onClick ? 'cursor-pointer active:scale-95' : ''}
        ${className || ''}
      `}
            style={style}
            title={tooltip}
            onClick={onClick}
        >
            {(title || value) && (
                <div className="mb-2">
                    {title && (
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-2">
                            {title}
                        </div>
                    )}
                    {value && (
                        <div className="text-3xl font-black text-slate-900 leading-none tracking-tight">
                            {value}
                        </div>
                    )}
                </div>
            )}

            {children}

            {subtext && (
                <div className="mt-3 text-xs font-bold text-slate-400 flex items-center gap-1">
                    {subtext}
                </div>
            )}
        </div>
    );
};

export default KPICard;
