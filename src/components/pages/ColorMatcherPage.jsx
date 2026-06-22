import { Tab } from '@headlessui/react';
import { Palette, Camera, Pipette, LayoutGrid } from 'lucide-react';
import PhotoMatchTab from './color/PhotoMatchTab';
import ManualMatchTab from './color/ManualMatchTab';
import ChartSetupTab from './color/ChartSetupTab';

const TABS = [
    { name: 'Desde foto', Icon: Camera, Comp: PhotoMatchTab },
    { name: 'Manual (LAB → CMYK)', Icon: Pipette, Comp: ManualMatchTab },
    { name: 'Chart / Referencia', Icon: LayoutGrid, Comp: ChartSetupTab },
];

export default function ColorMatcherPage() {
    return (
        <div className="min-h-full p-4 md:p-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-brand-cyan/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Palette size={22} className="text-brand-cyan" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-zinc-800">Igualador de Color</h1>
                    <p className="text-sm text-zinc-500">Capturá desde foto calibrada o ingresá LAB manual</p>
                </div>
            </div>

            <Tab.Group defaultIndex={0}>
                <Tab.List className="flex flex-wrap gap-1 mb-5 border-b border-zinc-200">
                    {TABS.map(({ name, Icon }) => (
                        <Tab
                            key={name}
                            className={({ selected }) =>
                                `flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap focus:outline-none transition-colors ${
                                    selected
                                        ? 'border-brand-cyan text-brand-cyan'
                                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                                }`
                            }
                        >
                            <Icon size={15} />
                            {name}
                        </Tab>
                    ))}
                </Tab.List>
                <Tab.Panels>
                    {TABS.map(({ name, Comp }) => (
                        <Tab.Panel key={name} className="focus:outline-none">
                            <Comp />
                        </Tab.Panel>
                    ))}
                </Tab.Panels>
            </Tab.Group>
        </div>
    );
}
