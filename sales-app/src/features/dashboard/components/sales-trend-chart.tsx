import React, { useState } from 'react';

interface ChartPoint {
    month: string;
    sales: number; // in LKR
    formatted: string;
}

const DATA_POINTS: ChartPoint[] = [
    { month: 'Jan', sales: 1200000, formatted: 'LKR 1,200,000' },
    { month: 'Feb', sales: 1900000, formatted: 'LKR 1,900,000' },
    { month: 'Mar', sales: 2200000, formatted: 'LKR 2,200,000' },
    { month: 'Apr', sales: 2800000, formatted: 'LKR 2,800,000' },
    { month: 'May', sales: 3100000, formatted: 'LKR 3,100,000' },
    { month: 'Jun', sales: 4500000, formatted: 'LKR 4,500,000' },
    { month: 'Jul', sales: 5200000, formatted: 'LKR 5,200,000' },
    { month: 'Aug', sales: 6800000, formatted: 'LKR 6,800,000' },
    { month: 'Sep', sales: 8450000, formatted: 'LKR 8,450,000' },
];

export const SalesTrendChart: React.FC = () => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const width = 640;
    const height = 240;
    const paddingX = 40;
    const paddingY = 30;

    const maxVal = 9500000;
    const minVal = 1000000;

    const points = DATA_POINTS.map((d, index) => {
        const x = paddingX + (index / (DATA_POINTS.length - 1)) * (width - 2 * paddingX);
        const y = height - paddingY - ((d.sales - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
        return { ...d, x, y };
    });

    const pathD = points.reduce((acc, p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = points[i - 1];
        const cpX1 = prev.x + (p.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (p.x - prev.x) / 2;
        const cpY2 = p.y;
        return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    return (
        <div className="w-full relative select-none">
            <div className="flex items-center justify-between text-xs mb-3">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                        <span className="font-semibold text-slate-700">Confirmed Order Revenue</span>
                    </div>
                    <span className="text-slate-400 font-mono tabular-nums">YTD: LKR 8.45M</span>
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    +14.2% MoM Expansion
                </div>
            </div>

            <div className="w-full">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-56 text-slate-400 overflow-visible"
                >
                    <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[2000000, 4000000, 6000000, 8000000].map((val) => {
                        const y = height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
                        return (
                            <g key={val}>
                                <line
                                    x1={paddingX}
                                    y1={y}
                                    x2={width - paddingX}
                                    y2={y}
                                    stroke="#e2e8f0"
                                    strokeDasharray="4 4"
                                />
                                <text
                                    x={paddingX - 8}
                                    y={y + 3}
                                    textAnchor="end"
                                    className="text-[10px] fill-slate-400 font-mono"
                                >
                                    {(val / 1000000).toFixed(0)}M
                                </text>
                            </g>
                        );
                    })}

                    {/* Area under curve */}
                    <path d={areaD} fill="url(#salesGrad)" />

                    {/* Line curve */}
                    <path
                        d={pathD}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />

                    {/* Interactive Points */}
                    {points.map((p, idx) => {
                        const isHovered = hoveredIndex === idx;
                        return (
                            <g
                                key={p.month}
                                onMouseEnter={() => setHoveredIndex(idx)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                className="cursor-pointer"
                            >
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={isHovered ? 6 : 4}
                                    className={`transition-all duration-150 ${
                                        isHovered ? 'fill-sky-600 stroke-white stroke-2' : 'fill-white stroke-sky-600 stroke-2'
                                    }`}
                                />

                                {/* X axis labels */}
                                <text
                                    x={p.x}
                                    y={height - 10}
                                    textAnchor="middle"
                                    className={`text-[10px] font-medium ${isHovered ? 'fill-sky-700 font-bold' : 'fill-slate-500'}`}
                                >
                                    {p.month}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Floating Tooltip info */}
            {hoveredIndex !== null && (
                <div
                    className="absolute -top-3 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg pointer-events-none transition-all duration-100 z-20 flex items-center gap-2"
                    style={{
                        left: `${((points[hoveredIndex].x) / width) * 100}%`
                    }}
                >
                    <span className="font-semibold text-slate-300">{points[hoveredIndex].month}:</span>
                    <span className="font-bold text-sky-300 font-mono tabular-nums">{points[hoveredIndex].formatted}</span>
                </div>
            )}
        </div>
    );
};
