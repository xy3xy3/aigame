<template>
  <div class="leaderboard-chart-container">
    <!-- Loading State -->
    <div v-if="pending" class="chart-loading text-center text-gray-500 py-8">
      正在加载图表数据...
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="chart-error text-center text-red-500 py-8">
      加载失败: {{ error.message }}
    </div>

    <!-- No Data State -->
    <div
      v-else-if="!data || !data.teams || data.teams.length === 0"
      class="chart-no-data text-center text-gray-500 py-8"
    >
      暂无数据可显示
    </div>

    <!-- Chart Container -->
    <div v-else ref="chartContainer" class="chart-wrapper w-full h-96"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, markRaw } from "vue";
import * as echarts from "echarts";
import type { EChartsType } from "echarts";

// 定义从后端获取的数据结构
interface LeaderboardHistoryResponse {
  competition: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
  };
  teams: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    history: Array<{
      timestamp: Date;
      score: number;
    }>;
  }>;
  isCached: boolean;
}

const props = defineProps<{
  competitionId: string;
}>();

// 响应式数据
const chartContainer = ref<HTMLDivElement | null>(null);
const chartInstance = ref<EChartsType | null>(null);
const data = ref<LeaderboardHistoryResponse | null>(null);
const pending = ref<boolean>(true);
const error = ref<Error | null>(null);

// 获取数据
const fetchData = async () => {
  try {
    pending.value = true;
    error.value = null;

    const response = await $fetch<LeaderboardHistoryResponse>(
      `/api/competitions/${props.competitionId}/leaderboard/history`
    );

    data.value = response;
  } catch (err: any) {
    error.value = err;
    console.error("Failed to fetch leaderboard history data:", err);
  } finally {
    pending.value = false;
  }
};

// 初始化图表
const initChart = () => {
  if (!chartContainer.value) return;

  try {
    // 销毁现有的图表实例
    if (chartInstance.value) {
      chartInstance.value.dispose();
      chartInstance.value = null;
    }

    // 创建新的图表实例
    chartInstance.value = markRaw(echarts.init(chartContainer.value));

    // 设置图表选项
    updateChartOptions();

    // 监听窗口大小变化
    window.addEventListener("resize", handleResize);
  } catch (err) {
    console.error("Failed to initialize chart:", err);
    error.value = new Error("图表初始化失败");
  }
};

// 更新图表选项
const updateChartOptions = () => {
  if (!chartInstance.value || !data.value) return;

  try {
    // 检查数据有效性
    if (!data.value.teams || !Array.isArray(data.value.teams)) {
      console.warn("Invalid teams data:", data.value.teams);
      return;
    }

    // 检查是否有数据
    const hasData = data.value.teams.some(
      (team) =>
        team && team.history && Array.isArray(team.history) && team.history.length > 0
    );

    if (!hasData) {
      chartInstance.value.setOption(
        {
          title: {
            text: "暂无数据",
            left: "center",
            top: "center",
          },
          xAxis: {
            type: "time",
          },
          yAxis: {
            type: "value",
            min: 0,
          },
          series: [],
        },
        true
      );
      return;
    }

    // 准备图表数据
    const seriesData = data.value.teams
      .filter((team) => team && team.history && Array.isArray(team.history)) // 确保队伍有历史数据
      .map((team) => {
        // 过滤并处理历史数据点
        const validDataPoints = team.history
          .filter(
            (point) => point && point.timestamp !== undefined && point.score !== undefined
          )
          .map((point) => {
            // 确保timestamp是有效的日期对象或字符串
            let timestamp;
            if (point.timestamp instanceof Date) {
              timestamp = point.timestamp.getTime();
            } else if (typeof point.timestamp === "string") {
              timestamp = new Date(point.timestamp).getTime();
            } else if (typeof point.timestamp === "number") {
              timestamp = point.timestamp;
            } else {
              console.warn(
                "Invalid timestamp type for team:",
                team.name,
                "point:",
                point
              );
              return null;
            }

            // 确保时间戳是有效的数字
            if (isNaN(timestamp)) {
              console.warn("Invalid timestamp for team:", team.name, "point:", point);
              return null;
            }

            // 确保分数是有效数字
            const score =
              typeof point.score === "number" ? point.score : parseFloat(point.score);
            if (isNaN(score)) {
              console.warn("Invalid score for team:", team.name, "point:", point);
              return null;
            }

            return [timestamp, score];
          })
          .filter((point) => point !== null) // 移除无效数据点
          .sort((a, b) => (a?.[0] || 0) - (b?.[0] || 0)); // 按时间戳排序

        // 去除重复的时间戳，只保留最新的分数
        const deduplicatedPoints: number[][] = [];
        const seen = new Set<number>();

        for (let i = validDataPoints.length - 1; i >= 0; i--) {
          const point = validDataPoints[i];
          if (point && Array.isArray(point) && point.length >= 2) {
            const timestamp = point[0];
            const score = point[1];
            if (
              typeof timestamp === "number" &&
              typeof score === "number" &&
              !seen.has(timestamp)
            ) {
              seen.add(timestamp);
              deduplicatedPoints.unshift([timestamp, score]);
            }
          }
        }

        // 确保至少有两个数据点，否则 ECharts 可能出错
        if (deduplicatedPoints.length === 1 && data.value) {
          const singlePoint = deduplicatedPoints[0];
          const startTime = new Date(data.value.competition.startTime).getTime();
          if (singlePoint && singlePoint[0] && singlePoint[0] > startTime) {
            deduplicatedPoints.unshift([startTime, 0]);
          } else if (singlePoint && singlePoint[0] && singlePoint[1]) {
            deduplicatedPoints.push([singlePoint[0] + 1000, singlePoint[1]]);
          }
        }

        return {
          name: team.name || `团队${team.id}`,
          type: "line",
          data: deduplicatedPoints,
          smooth: false, // 关闭平滑，减少计算复杂度
          showSymbol: false,
          lineStyle: {
            width: 2,
          },
        };
      })
      .filter((series) => series && series.data && series.data.length >= 2); // 只保留有足够数据点的系列

    // 如果处理后没有有效的系列数据，显示无数据状态
    if (seriesData.length === 0) {
      chartInstance.value.setOption(
        {
          title: {
            text: "暂无有效数据",
            left: "center",
            top: "center",
          },
          xAxis: {
            type: "time",
          },
          yAxis: {
            type: "value",
          },
          series: [],
        },
        true
      );
      return;
    }

    // 计算 Y 轴范围
    let maxScore = 0;
    seriesData.forEach((series) => {
      if (series.data && Array.isArray(series.data)) {
        series.data.forEach((point: number[]) => {
          if (
            point &&
            point.length >= 2 &&
            typeof point[1] === "number" &&
            point[1] > maxScore
          ) {
            maxScore = point[1];
          }
        });
      }
    });

    // 准备散点图数据
    const scatterSeriesData = seriesData.map((series) => {
      return {
        name: series.name,
        type: "scatter",
        data: series.data,
        symbolSize: 6, // 设置标记点的大小
        // 确保散点图不显示在图例中，只显示线图
        legendHoverLink: false,
        // 可以添加其他样式配置
      };
    });

    // 基础配置 - 简化以减少出错可能性
    const option = {
      title: {
        text: `${data.value.competition.title} - 排行榜历史`,
        left: "center",
      },
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          if (!params || params.length === 0) return "";
          const date = new Date(params[0].value[0]);
          let tooltipText = `${date.toLocaleString("zh-CN")}<br/>`;
          params.forEach((param: any) => {
            // 只显示线图的 Tooltip 信息，避免重复
            if (
              param &&
              param.seriesName &&
              param.value &&
              Array.isArray(param.value) &&
              param.seriesType === "line"
            ) {
              tooltipText += `${param.marker} ${param.seriesName}: ${param.value[1]}<br/>`;
            }
          });
          return tooltipText;
        },
      },
      legend: {
        type: "scroll",
        top: 30,
        data: seriesData.map((series) => series.name),
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "80px", // 为 dataZoom 滑动条留出空间
        top: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "time",
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        min: 0,
        max: Math.ceil(maxScore * 1.1) || 100,
      },
      dataZoom: [
        {
          type: "inside", // 启用鼠标滚轮在图表内部进行缩放
          start: 0,
          end: 100,
        },
        {
          type: "slider", // 在图表底部生成一个可以拖动的缩放滑动条
          start: 0,
          end: 100,
          height: 20, // 滑动条高度
          bottom: 20, // 滑动条位置
        },
      ],
      series: [
        ...seriesData, // 线图系列
        ...scatterSeriesData, // 散点图系列
      ],
    };

    // 使用 notMerge: true 完全替换配置
    chartInstance.value.setOption(option, { notMerge: true });
  } catch (err) {
    console.error("Failed to update chart options:", err);
    // 显示错误状态
    if (chartInstance.value) {
      chartInstance.value.setOption(
        {
          title: {
            text: "图表渲染错误",
            subtext: "请刷新页面重试",
            left: "center",
            top: "center",
          },
          xAxis: {
            type: "time",
          },
          yAxis: {
            type: "value",
          },
          series: [],
        },
        { notMerge: true }
      );
    }
  }
};

// 处理窗口大小变化
const handleResize = () => {
  try {
    if (chartInstance.value && typeof chartInstance.value.resize === "function") {
      chartInstance.value.resize({
        animation: {
          duration: 300,
          easing: "cubicOut",
        },
      });
    }
  } catch (err) {
    console.error("Error during chart resize:", err);
    // 如果 resize 失败，尝试重新初始化图表
    if (data.value && !pending.value && !error.value) {
      setTimeout(() => {
        try {
          initChart();
        } catch (reinitError) {
          console.error("Failed to reinitialize chart after resize error:", reinitError);
        }
      }, 100);
    }
  }
};

// 监听数据变化并更新图表
watch(data, () => {
  if (data.value && !pending.value && !error.value) {
    if (!chartInstance.value && chartContainer.value) {
      initChart();
    } else {
      updateChartOptions();
    }
  }
});

// 监听 pending 状态变化并更新图表
watch(pending, () => {
  if (!pending.value && data.value && !error.value) {
    if (!chartInstance.value && chartContainer.value) {
      initChart();
    } else {
      updateChartOptions();
    }
  }
});

// 组件挂载时初始化
onMounted(async () => {
  await fetchData();
  // 确保在数据加载完成后初始化图表
  if (!pending.value && data.value && !error.value) {
    if (!chartInstance.value && chartContainer.value) {
      initChart();
    } else {
      updateChartOptions();
    }
  }
});

// 组件卸载前清理
onBeforeUnmount(() => {
  try {
    // 移除事件监听器
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", handleResize);
    }

    // 销毁图表实例
    if (chartInstance.value) {
      // 清除所有事件监听器
      chartInstance.value.off();
      // 销毁实例
      chartInstance.value.dispose();
      chartInstance.value = null;
    }
  } catch (err) {
    console.error("Error during chart cleanup:", err);
  }
});

// 监听 competitionId 变化并重新获取数据
watch(
  () => props.competitionId,
  async (newId) => {
    if (newId) {
      await fetchData();
    }
  }
);
</script>

<style scoped>
.leaderboard-chart-container {
  margin: 2rem 0;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-wrapper {
  min-height: 384px; /* 96 * 4px (h-96) */
}
</style>
