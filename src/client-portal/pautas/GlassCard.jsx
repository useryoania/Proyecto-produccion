import React from 'react';

export const GlassCard = ({ title, icon: Icon, children, className = '', noPadding = false, ...props }) => {
    return (
        <div
            className={`glass-panel rounded-xl ${noPadding ? '' : 'p-6'} ${className}`}
            {...props}
        >
            {title && (
                <div className="mb-6">
                    <h3 className="text-xl font-extrabold text-zinc-100 flex items-center gap-3">
                        {Icon ? (
                            <Icon size={22} className="text-brand-gold" />
                        ) : (
                            <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm shadow-lg">
                                {title.split('.')[0]}
                            </span>
                        )}
                        {Icon ? title : title.split('.').slice(1).join('.').trim()}
                    </h3>
                    <div className="h-[2px] w-full bg-gradient-to-r from-brand-gold/20 via-white/5 to-transparent mt-3" />
                </div>
            )}
            {children}
        </div>
    );
};
