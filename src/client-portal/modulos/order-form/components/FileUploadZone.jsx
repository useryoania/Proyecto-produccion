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
            className={`relative group transition-all duration-300 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer
                ${selectedFile ? 'border-emerald-500/50 bg-emerald-500/10' : (isOver ? 'border-cyan-400 bg-cyan-400/10' : 'border-zinc-600 bg-zinc-800/40 hover:border-zinc-500 hover:bg-zinc-800/60')}`}
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
                <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                    <CheckCircle size={28} className="text-emerald-400 mb-2" />
                    <span className="text-[10px] font-bold text-emerald-300 truncate max-w-[150px]">
                        {multiple ? 'Archivos listos' : selectedFile.name}
                    </span>
                    <p className="text-[10px] text-emerald-400/70 uppercase tracking-tighter">
                        {multiple ? '+ Agregar más' : 'Listo para Drive'}
                    </p>
                </div>
            ) : (
                <>
                    <div className={`p-2 rounded-full ${isOver ? 'bg-cyan-400/20' : 'bg-zinc-700 group-hover:bg-zinc-600'} transition-colors`}>
                        <Icon size={24} className={isOver ? 'text-cyan-400' : 'text-zinc-400'} />
                    </div>
                    <div className="text-center">
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-tight">{label}</span>
                        <p className="text-[9px] text-zinc-500">Arrastra o haz click</p>
                    </div>
                </>
            )}
        </div>
    );
};

export default FileUploadZone;
