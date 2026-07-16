import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface SpeedGaugeProps {
  value: number; // 0-100
  label?: string;
}

export default function SpeedGauge({ value, label = 'Parsing Speed' }: SpeedGaugeProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option = {
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          splitNumber: 10,
          axisLine: {
            lineStyle: {
              width: 20,
              color: [
                [0.3, '#67e0e3'],
                [0.7, '#37a2da'],
                [1, '#fd666d']
              ]
            }
          },
          pointer: {
            itemStyle: {
              color: 'auto'
            },
            width: 4,
            length: '60%'
          },
          axisTick: {
            distance: -20,
            length: 6,
            lineStyle: {
              color: '#fff',
              width: 1
            }
          },
          splitLine: {
            distance: -20,
            length: 20,
            lineStyle: {
              color: '#fff',
              width: 2
            }
          },
          axisLabel: {
            color: 'inherit',
            distance: 30,
            fontSize: 12
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            color: 'inherit',
            fontSize: 24,
            offsetCenter: [0, '70%']
          },
          title: {
            show: true,
            offsetCenter: [0, '90%'],
            fontSize: 14,
            color: '#666'
          },
          data: [
            {
              value: value,
              name: label
            }
          ]
        }
      ]
    };

    chartInstance.current.setOption(option);

    // Cleanup
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [value, label]);

  return (
    <div 
      ref={chartRef} 
      style={{ width: '100%', height: '250px' }}
      className="flex items-center justify-center"
    />
  );
}
