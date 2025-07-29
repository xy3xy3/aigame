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
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
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

  // 销毁现有的图表实例
  if (chartInstance.value) {
    chartInstance.value.dispose();
  }

  // 创建新的图表实例
  chartInstance.value = echarts.init(chartContainer.value);

  // 设置图表选项
  updateChartOptions();

  // 监听窗口大小变化
  window.addEventListener("resize", handleResize);
};

// 更新图表选项
const updateChartOptions = () => {
  if (!chartInstance.value || !data.value) return;

  // 检查是否有数据
  const hasData = data.value.teams.some((team) => team.history.length > 0);

  if (!hasData) {
    chartInstance.value.setOption({
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
      },
    });
    return;
  }

  // 准备图表数据
  const seriesData = data.value.teams
    .filter((team) => team.history && Array.isArray(team.history)) // 确保队伍有历史数据
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
            console.warn("Invalid timestamp type for team:", team.name, "point:", point);
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
        .filter((point) => point !== null); // 移除无效数据点

      return {
        name: team.name,
        type: "line",
        smooth: true,
        showSymbol: false, // 不显示数据点，使线条更平滑
        sampling: "lttb",
        data: validDataPoints,
      };
    })
    .filter((series) => series && series.data && series.data.length > 0); // 只保留有有效数据的系列

  // 设置图表选项
  const option = {
    title: {
      text: `${data.value.competition.title} - 排行榜历史`,
      subtext: data.value.isCached ? "缓存数据" : "实时数据",
      left: "center",
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        if (!params || params.length === 0) return "";

        const date = new Date(params[0].value[0]);
        let tooltipText = `${date.toLocaleString("zh-CN")}<br/>`;

        params.forEach((param: any) => {
          tooltipText += `${param.marker} ${param.seriesName}: ${param.value[1]}<br/>`;
        });

        return tooltipText;
      },
    },
    legend: {
      type: "scroll", // 可滚动的图例
      orient: "horizontal",
      top: 30,
      data: data.value.teams.map((team) => team.name),
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "time",
      name: "时间",
      nameLocation: "middle",
      nameGap: 30,
      min: new Date(data.value.competition.startTime).getTime(),
      max: new Date(data.value.competition.endTime).getTime(),
    },
    yAxis: {
      type: "value",
      name: "分数",
      nameLocation: "middle",
      nameGap: 50,
    },
    dataZoom: [
      {
        type: "inside",
        start: 0,
        end: 100,
        filterMode: "none",
      },
      {
        type: "slider",
        start: 0,
        end: 100,
        bottom: 10,
        filterMode: "none",
      },
    ],
    series: seriesData.filter((series) => series !== null), // 确保系列数据不为null
  };

  chartInstance.value.setOption(option, true);
};

// 处理窗口大小变化
const handleResize = () => {
  if (chartInstance.value) {
    chartInstance.value.resize();
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
  window.removeEventListener("resize", handleResize);
  if (chartInstance.value) {
    chartInstance.value.dispose();
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
