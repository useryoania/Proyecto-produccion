import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDown, Check } from 'lucide-react';

export function CustomSelect({ value, onChange, options, placeholder, disabled, size = 'normal', direction = 'down', className = '' }) {
    const selected = options.find(o => String(o.value) === String(value)) || null;

    const sizeClasses = size === 'small'
        ? 'p-2.5 text-sm rounded-lg'
        : 'p-3 text-base rounded-xl';

    return (
        <Listbox value={value} onChange={onChange} disabled={disabled}>
            <div className="relative">
                <Listbox.Button
                    className={`relative w-full ${sizeClasses} pr-10 border border-zinc-700 bg-brand-dark text-left font-medium
                        focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 cursor-pointer transition-all duration-200
                        hover:border-zinc-500
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        ${selected ? 'text-zinc-200' : 'text-zinc-500'} ${className}`}
                >
                    <span className="block truncate">
                        {selected ? selected.label : (placeholder || 'Seleccionar...')}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <ChevronDown size={16} className="text-zinc-400 transition-transform duration-200 ui-open:rotate-180" />
                    </span>
                </Listbox.Button>

                <Transition
                    as={Fragment}
                    enter="transition duration-200 ease-out"
                    enterFrom={`opacity-0 scale-[0.98] ${direction === 'up' ? 'translate-y-1' : '-translate-y-1'}`}
                    enterTo="opacity-100 translate-y-0 scale-100"
                    leave="transition duration-150 ease-in"
                    leaveFrom="opacity-100 translate-y-0 scale-100"
                    leaveTo={`opacity-0 scale-[0.98] ${direction === 'up' ? 'translate-y-1' : '-translate-y-1'}`}
                >
                    <Listbox.Options className={`absolute z-50 max-h-56 w-full overflow-auto rounded-xl bg-brand-dark border border-zinc-700 shadow-xl shadow-black/40 focus:outline-none scrollbar-thin ${direction === 'up' ? 'bottom-full mb-1.5' : 'mt-1.5'}`}>
                        {options.map((option) => (
                            <Listbox.Option
                                key={option.value}
                                value={option.value}
                                className={({ active, selected }) =>
                                    `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors duration-100
                                    ${active ? 'bg-brand-cyan/10 text-zinc-100' : 'text-zinc-300'}
                                    ${selected ? 'font-semibold' : 'font-normal'}`
                                }
                            >
                                {({ selected }) => (
                                    <>
                                        <span className="block truncate">{option.label}</span>
                                        {selected && (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-custom-cyan">
                                                <Check size={16} />
                                            </span>
                                        )}
                                    </>
                                )}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Transition>
            </div>
        </Listbox>
    );
}
