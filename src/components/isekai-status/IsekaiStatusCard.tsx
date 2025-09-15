"use client";

import { IsekaiStatus } from '@/types';
import { useMemo } from 'react';

interface IsekaiStatusCardProps {
    status: IsekaiStatus;
}

const StatBar = ({ label, value, max = 99 }: { label: string; value: number; max?: number }) => {
    const percentage = (value / max) * 100;
    const barColor =
        percentage > 80 ? 'bg-red-500' :
        percentage > 60 ? 'bg-yellow-500' :
        percentage > 40 ? 'bg-green-500' :
        'bg-blue-500';

    return (
        <div className="flex items-center">
            <span className="w-20 text-sm font-semibold uppercase tracking-widest">{label}</span>
            <div className="w-full bg-gray-600/50 rounded-full h-2.5 mx-2">
                <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
            <span className="w-8 text-right font-bold">{value}</span>
        </div>
    );
};

export const IsekaiStatusCard: React.FC<IsekaiStatusCardProps> = ({ status }) => {
    const { name, epithet, job, level, params, uniqueSkill, partySkill, equipment } = status;

    const maxParam = useMemo(() => Math.max(...Object.values(params), 1), [params]);

    return (
        <div id="isekai-status-card" className="aspect-[16/9] bg-cover bg-center p-5 sm:p-7 text-white font-mono shadow-2xl rounded-2xl border-2 border-yellow-300/30 bg-gray-900" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Cg fill-rule=\'evenodd\'%3E%3Cg fill=\'%23a28b00\' fill-opacity=\'0.1\'%3E%3Cpath opacity=\'.5\' d=\'M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
            <div className="flex flex-col h-full">
                {/* Header */}
                <header className="border-b-2 border-yellow-300/50 pb-2 mb-3 text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold text-yellow-300" style={{ textShadow: '0 0 5px #fde047' }}>
                        {name}
                    </h2>
                    <p className="text-sm sm:text-base text-yellow-100/80 mt-1">{`-- ${epithet} --`}</p>
                </header>

                {/* Body */}
                <main className="flex-grow grid grid-cols-5 gap-x-4 sm:gap-x-6">
                    {/* Left Panel: Job, Level, Params */}
                    <div className="col-span-3 pr-3 sm:pr-4 border-r border-yellow-300/30">
                        <div className="flex justify-between items-baseline mb-3">
                            <div>
                                <span className="text-xs sm:text-sm text-yellow-200/70">職業: </span>
                                <span className="text-base sm:text-lg font-bold">{job}</span>
                            </div>
                            <div>
                                <span className="text-xs sm:text-sm text-yellow-200/70">Lv: </span>
                                <span className="text-2xl sm:text-3xl font-bold text-green-400">{level}</span>
                            </div>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                            <StatBar label="ちから" value={params.strength} max={maxParam} />
                            <StatBar label="まりょく" value={params.magic} max={maxParam} />
                            <StatBar label="すばやさ" value={params.agility} max={maxParam} />
                            <StatBar label="きようさ" value={params.dexterity} max={maxParam} />
                            <StatBar label="うんのよさ" value={params.luck} max={maxParam} />
                        </div>
                    </div>

                    {/* Right Panel: Skills & Equipment */}
                    <div className="col-span-2 space-y-3 sm:space-y-4">
                        <div>
                            <h3 className="text-xs sm:text-sm font-bold text-yellow-200/70 border-b border-yellow-300/20 mb-1 pb-0.5 uppercase">Unique Skill</h3>
                            <p className="text-sm sm:text-base leading-tight text-cyan-300">{uniqueSkill}</p>
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-bold text-yellow-200/70 border-b border-yellow-300/20 mb-1 pb-0.5 uppercase">Party Skill</h3>
                            <p className="text-sm sm:text-base leading-tight">{partySkill}</p>
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-bold text-yellow-200/70 border-b border-yellow-300/20 mb-1 pb-0.5 uppercase">Equipment</h3>
                            <ul className="space-y-0.5 text-sm sm:text-base">
                                {equipment.map(eq => <li key={eq}>- {eq}</li>)}
                            </ul>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-auto pt-2 text-right">
                    <p className="text-xs text-yellow-100/50">#異世界転生ステータスカード</p>
                </footer>
            </div>
        </div>
    );
};
