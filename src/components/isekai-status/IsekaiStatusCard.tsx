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
            <span className="w-16 sm:w-20 text-xs sm:text-sm font-semibold uppercase tracking-wider text-right mr-2">{label}</span>
            <div className="flex-1 bg-gray-600/50 rounded-full h-2 sm:h-2.5 mx-1 sm:mx-2">
                <div className={`${barColor} h-2 sm:h-2.5 rounded-full transition-all duration-300`} style={{ width: `${percentage}%` }}></div>
            </div>
            <span className="w-6 sm:w-8 text-right font-bold text-xs sm:text-sm">{value}</span>
        </div>
    );
};

export const IsekaiStatusCard: React.FC<IsekaiStatusCardProps> = ({ status }) => {
    const { name, epithet, job, level, params, uniqueSkill, partySkill, equipment } = status;

    const maxParam = useMemo(() => Math.max(...Object.values(params), 1), [params]);

    return (
        <div id="isekai-status-card" className="w-full max-w-4xl mx-auto sm:aspect-[16/9] bg-cover bg-center p-3 sm:p-5 lg:p-7 text-white font-mono shadow-2xl rounded-lg sm:rounded-2xl border border-yellow-300/30 sm:border-2 bg-gray-900" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Cg fill-rule=\'evenodd\'%3E%3Cg fill=\'%23a28b00\' fill-opacity=\'0.1\'%3E%3Cpath opacity=\'.5\' d=\'M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', minHeight: '350px' }}>
            <div className="flex flex-col sm:h-full min-h-full">
                {/* Header */}
                <header className="border-b border-yellow-300/50 sm:border-b-2 pb-1 sm:pb-2 mb-2 sm:mb-3 text-center">
                    <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-yellow-300 leading-tight" style={{ textShadow: '0 0 5px #fde047' }}>
                        {name}
                    </h2>
                    <p className="text-xs sm:text-sm lg:text-base text-yellow-100/80 mt-0.5 sm:mt-1">{`-- ${epithet} --`}</p>
                </header>

                {/* Body */}
                <main className="flex-grow grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-x-4 lg:gap-x-6">
                    {/* Left Panel: Job, Level, Params */}
                    <div className="sm:col-span-3 sm:pr-3 lg:pr-4 sm:border-r border-yellow-300/30">
                        <div className="flex justify-between items-baseline mb-2 sm:mb-3">
                            <div>
                                <span className="text-xs text-yellow-200/70">職業: </span>
                                <span className="text-sm sm:text-base lg:text-lg font-bold">{job}</span>
                            </div>
                            <div>
                                <span className="text-xs text-yellow-200/70">Lv: </span>
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-400">{level}</span>
                            </div>
                        </div>
                        <div className="space-y-1 sm:space-y-1.5 lg:space-y-2">
                            <StatBar label="ちから" value={params.strength} max={maxParam} />
                            <StatBar label="まりょく" value={params.magic} max={maxParam} />
                            <StatBar label="すばやさ" value={params.agility} max={maxParam} />
                            <StatBar label="きようさ" value={params.dexterity} max={maxParam} />
                            <StatBar label="うんのよさ" value={params.luck} max={maxParam} />
                        </div>
                    </div>

                    {/* Right Panel: Skills & Equipment */}
                    <div className="sm:col-span-2 space-y-3 sm:space-y-3 lg:space-y-4 mt-2 sm:mt-0">
                        <div>
                            <h3 className="text-xs font-bold text-yellow-200/70 border-b border-yellow-300/20 mb-1 pb-0.5 uppercase">Unique Skill</h3>
                            <p className="text-xs sm:text-sm lg:text-base leading-tight text-cyan-300 break-words">{uniqueSkill}</p>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-yellow-200/70 border-b border-yellow-300/20 mb-1 pb-0.5 uppercase">Party Skill</h3>
                            <p className="text-xs sm:text-sm lg:text-base leading-tight break-words">{partySkill}</p>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-yellow-200/70 border-b border-yellow-300/20 mb-1 pb-0.5 uppercase">Equipment</h3>
                            <ul className="space-y-0.5 text-xs sm:text-sm lg:text-base">
                                {equipment.map(eq => <li key={eq} className="break-words">- {eq}</li>)}
                            </ul>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-auto pt-1 sm:pt-2 text-right">
                    <p className="text-xs text-yellow-100/50">#異世界転生ステータスカード</p>
                </footer>
            </div>
        </div>
    );
};
