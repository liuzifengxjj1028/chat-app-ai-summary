import { Cloud } from 'lucide-react';

export function WeatherCard() {
  return (
    <div className="bg-slate-700 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <Cloud className="w-12 h-12 text-white" />
        <div>
          <div className="text-white text-3xl">19°</div>
          <div className="text-slate-300 text-sm">多云</div>
        </div>
      </div>
      
      <div className="space-y-1 text-slate-300 text-sm">
        <div className="flex items-center gap-2">
          <span>📍</span>
          <span>Yiqiaoxihui</span>
        </div>
        <div className="flex items-center gap-2">
          <span>☀️</span>
          <span>天气很好</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🌡️</span>
          <span>建议穿着</span>
        </div>
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span>晴天备忘</span>
        </div>
      </div>
    </div>
  );
}
