<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6 text-center">比赛排行榜</h1>

    <!-- Loading State -->
    <div v-if="pending || problemsPending" class="text-center text-gray-500">
      正在加载排行榜数据...
    </div>

    <!-- Error State -->
    <div v-else-if="error || problemsError" class="text-center text-red-500">
      加载失败: {{ error?.message || problemsError?.message }}
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!leaderboardData || leaderboardData.length === 0"
      class="text-center text-gray-500"
    >
      暂无队伍参赛，敬请期待。
    </div>

    <!-- Data Table -->
    <div v-else class="overflow-x-auto shadow-md sm:rounded-lg">
      <table class="min-w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" class="px-4 py-3 sticky left-0 bg-gray-50 z-10">排名</th>
            <th scope="col" class="px-4 py-3 sticky left-16 bg-gray-50 z-10">队伍</th>
            <th scope="col" class="px-4 py-3">解题数</th>
            <th scope="col" class="px-4 py-3">总罚时</th>
            <th
              v-for="problem in problemsData?.problems || []"
              :key="problem.id"
              scope="col"
              class="px-3 py-3 text-center min-w-[80px]"
            >
              {{ problem.title }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in leaderboardData"
            :key="entry.team.id"
            class="bg-white border-b hover:bg-gray-50"
          >
            <td class="px-4 py-4 font-medium text-gray-900 sticky left-0 bg-white z-10">
              {{ entry.rank }}
            </td>
            <td class="px-4 py-4 sticky left-16 bg-white z-10">
              <NuxtLink
                :to="`/teams/${entry.team.id}`"
                class="text-blue-600 hover:underline"
              >
                {{ entry.team.name }}
              </NuxtLink>
            </td>
            <td class="px-4 py-4 font-medium text-green-600">
              {{ entry.problemsSolved }}
            </td>
            <td class="px-4 py-4">{{ entry.totalPenalty }}</td>
            <td
              v-for="problem in problemsData?.problems || []"
              :key="problem.id"
              class="px-3 py-4 text-center"
            >
              <div v-if="entry.problemStats[problem.id]">
                <div
                  v-if="entry.problemStats[problem.id]?.solved"
                  class="text-green-600 font-medium"
                >
                  ✓ {{ entry.problemStats[problem.id]?.attempts }}
                  <div class="text-xs text-gray-500">
                    {{ entry.problemStats[problem.id]?.penalty }}
                  </div>
                </div>
                <div
                  v-else-if="(entry.problemStats[problem.id]?.attempts || 0) > 0"
                  class="text-red-600"
                >
                  ✗ {{ entry.problemStats[problem.id]?.attempts }}
                </div>
                <div v-else class="text-gray-400">-</div>
              </div>
              <div v-else class="text-gray-400">-</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();

// 定义排行榜条目的数据结构
interface TeamLeaderboardEntry {
  rank: number;
  team: {
    id: string;
    name: string;
  };
  problemsSolved: number;
  totalPenalty: number;
  problemStats: Record<
    string,
    {
      attempts: number;
      solved: boolean;
      penalty: number;
    }
  >;
}

// 定义题目数据结构
interface Problem {
  id: string;
  title: string;
  shortDescription: string;
  startTime: string;
  endTime: string;
  score: number;
  status: string;
}

interface ProblemsResponse {
  success: boolean;
  problems: Problem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 获取排行榜数据
const { data: leaderboardData, pending, error } = useFetch<TeamLeaderboardEntry[]>(
  () => `/api/competitions/${route.params.id}/leaderboard`
);

// 获取题目数据
const {
  data: problemsData,
  pending: problemsPending,
  error: problemsError,
} = useFetch<ProblemsResponse>(() => `/api/competitions/${route.params.id}/problems`);

definePageMeta({
  middleware: "auth",
});
</script>
