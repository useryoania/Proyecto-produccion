import React, { useState } from 'react';
import { UploadCloud, CheckCircle } from 'lucide-react';

export const FileUploadZone = ({ id, onFileSelected, selectedFile, label, icon: Icon = UploadCloud, color = "blue", multiple = false }) => {
    const [isOver, setIsOver] = useState(false);
    const uniqueId = `file-input-${id}-${label.replace(/\s+/g, '-')}`;

    const handleDrop = (e) => {
        e.preventDefault();
        setIsOver(false);
        if (multiple) {
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) onFileSelected(files);
        } else {
            const file = e.dataTransfer.files[0];
            if (file) onFileSelected(file);
        }
    };

    return (
        <div
            className={`relative group transition-all duration-500 border-2 border-dashed rounded-[1.5rem] p-6 flex flex-col items-center justify-center gap-3 cursor-pointer
                ${selectedFile ? 'border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/5' : (isOver ? 'border-cyan-400 bg-cyan-400/20 shadow-xl shadow-cyan-400/10 scale-[1.02]' : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-500 hover:bg-zinc-800/60 hover:scale-[1.01]')}`}
            onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
            onDragLeave={() => setIsOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById(uniqueId).click()}
        >
            <input
                id={uniqueId}
                type="file"
                multiple={multiple}
                className="hidden"
                onChange={(e) => {
                    if (multiple) {
                        onFileSelected(Array.from(e.target.files));
                    } else {
                        onFileSelected(e.target.files[0]);
                    }
                }}
            />

            {selectedFile ? (
                <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-2 border border-emerald-500/30">
                        <CheckCircle size={28} />
                    </div>
                    <span className="text-[10px] font-black text-emerald-100 truncate max-w-[180px] uppercase tracking-widest">
                        {multiple ? 'Archivos listos' : selectedFile.name}
                    </span>
                    <p className="text-[9px] text-emerald-400/60 uppercase font-black tracking-tighter mt-1">
                        {multiple ? '+ Agregar más' : 'Listo para procesar'}
                    </p>
                </div>
            ) : (
                <>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${isOver ? 'bg-cyan-400 text-zinc-900 rotate-12' : 'bg-zinc-700/50 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200'}`}>
                        <Icon size={28} />
                    </div>
                    <div className="text-center">
                        <span className="text-[10px] font-black text-zinc-400 block uppercase tracking-widest group-hover:text-zinc-200 transition-colors">{label}</span>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter mt-1">Arrastra o haz click</p>
                    </div>
                </>
            )}
        </div>
    );
};

export default FileUploadZone;
