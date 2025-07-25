<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6 text-center">比赛排行榜</h1>

    <!-- Loading State -->
    <div v-if="pending" class="text-center text-gray-500">正在加载排行榜数据...</div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center text-red-500">
      加载失败: {{ error.message }}
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
            <th scope="col" class="px-6 py-3">排名</th>
            <th scope="col" class="px-6 py-3">队伍</th>
            <th scope="col" class="px-6 py-3">解题数</th>
            <th scope="col" class="px-6 py-3">总罚时</th>
            <th
              v-for="(problem, index) in problems"
              :key="problem.id"
              scope="col"
              class="px-6 py-3 text-center"
            >
              {{ String.fromCharCode(65 + index) }}
            </th>
          </tr>
        </thead>
        <tbody v-if="leaderboardData">
          <tr
            v-for="entry in leaderboardData"
            :key="entry.team.id"
            class="bg-white border-b hover:bg-gray-50"
          >
            <td class="px-6 py-4 font-medium text-gray-900">{{ entry.rank }}</td>
            <td class="px-6 py-4">
              <NuxtLink
                :to="`/teams/${entry.team.id}`"
                class="text-blue-600 hover:underline"
              >
                {{ entry.team.name }}
              </NuxtLink>
            </td>
            <td class="px-6 py-4">{{ entry.problemsSolved }}</td>
            <td class="px-6 py-4">{{ entry.totalPenalty }}</td>
            <td
              v-for="problem in problems"
              :key="problem.id"
              class="px-6 py-4 text-center"
            >
              <div v-if="entry.problemStats[problem.id]">
                <div
                  v-if="entry.problemStats[problem.id].solved"
                  class="text-green-600 font-bold"
                >
                  {{ entry.problemStats[problem.id].penalty }}
                  <div class="text-xs text-gray-500">
                    (-{{ entry.problemStats[problem.id].attempts - 1 }})
                  </div>
                </div>
                <div
                  v-else-if="entry.problemStats[problem.id].attempts > 0"
                  class="text-red-500"
                >
                  -{{ entry.problemStats[problem.id].attempts }}
                </div>
                <div v-else>-</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const route = useRoute();
const competitionId = route.params.id as string;

// 定义排行榜条目和问题的数据结构
interface Problem {
  id: string;
  title: string;
}

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

const {
  data: leaderboardData,
  pending: leaderboardPending,
  error: leaderboardError,
} = useFetch<TeamLeaderboardEntry[]>(`/api/competitions/${competitionId}/leaderboard`);
const { data: problems, pending: problemsPending, error: problemsError } = useFetch<
  Problem[]
>(`/api/competitions/${competitionId}/problems`);

const pending = computed(() => leaderboardPending.value || problemsPending.value);
const error = computed(() => leaderboardError.value || problemsError.value);

definePageMeta({
  middleware: "auth",
});
</script>
