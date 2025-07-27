<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6 text-center">
      {{ data?.competitionTitle }} 排行榜
    </h1>

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
      v-else-if="!data?.leaderboard || data.leaderboard.length === 0"
      class="text-center text-gray-500"
    >
      暂无队伍参赛，敬请期待。
    </div>

    <!-- Data Table -->
    <div v-else class="overflow-x-auto shadow-md sm:rounded-lg">
      <table class="min-w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" class="px-4 py-3 sticky left-0 bg-gray-50 z-20 w-16">排名</th>
            <th scope="col" class="px-4 py-3 sticky left-16 bg-gray-50 z-10">队伍</th>
            <th scope="col" class="px-4 py-3">总分</th>
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
            v-for="entry in data?.leaderboard"
            :key="entry.team.id"
            class="bg-white border-b hover:bg-gray-50"
          >
            <td
              class="px-4 py-4 font-medium text-gray-900 sticky left-0 bg-white z-20 w-16"
            >
              {{ entry.rank }}
            </td>
            <td
              class="px-4 py-4 sticky left-16 bg-white z-10 cursor-pointer"
              @click="openModal(entry)"
            >
              <div class="flex items-center gap-x-2">
                <img
                  v-if="entry.team.avatarUrl"
                  :src="entry.team.avatarUrl"
                  :alt="entry.team.name"
                  class="w-8 h-8 rounded-full object-cover"
                />
                <div
                  v-else
                  class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center"
                >
                  <span class="font-bold text-indigo-600">{{
                    entry.team.name.charAt(0).toUpperCase()
                  }}</span>
                </div>
                <span>{{ entry.team.name }}</span>
              </div>
            </td>
            <td class="px-4 py-4 font-medium text-green-600">
              {{ entry.totalScore }}
            </td>
            <td
              v-for="problem in problemsData?.problems || []"
              :key="problem.id"
              class="px-3 py-4 text-center"
            >
              <div v-if="getProblemScore(entry, problem.id) !== undefined">
                <div class="text-green-600 font-medium">
                  {{ getProblemScore(entry, problem.id) }}
                </div>
              </div>
              <div v-else class="text-gray-400">-</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 overflow-y-auto">
      <div
        class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0"
      >
        <!-- Background overlay -->
        <div class="fixed inset-0 transition-opacity" @click="closeModal">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <!-- Modal content -->
        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3
                  class="text-lg leading-6 font-medium text-gray-900"
                  v-if="selectedTeam"
                >
                  {{ selectedTeam.team.name }} - 题目提交详情
                </h3>
                <div class="mt-2 w-full">
                  <table class="min-w-full divide-y divide-gray-200" v-if="selectedTeam">
                    <thead class="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          题目
                        </th>
                        <th
                          scope="col"
                          class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          得分
                        </th>
                        <th
                          scope="col"
                          class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          提交者
                        </th>
                        <th
                          scope="col"
                          class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          提交时间
                        </th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      <tr
                        v-for="problemScore in selectedTeam.problemScores"
                        :key="problemScore.problemId"
                      >
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {{ problemScore.problemTitle }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {{ problemScore.score }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div
                            v-if="problemScore.bestSubmission?.user"
                            class="flex items-center"
                          >
                            <img
                              v-if="problemScore.bestSubmission.user.avatarUrl"
                              :src="problemScore.bestSubmission.user.avatarUrl"
                              :alt="problemScore.bestSubmission.user.username"
                              class="w-6 h-6 rounded-full mr-2"
                            />
                            <span>{{ problemScore.bestSubmission.user.username }}</span>
                          </div>
                          <span v-else>-</span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {{
                            problemScore.bestSubmission?.submittedAt
                              ? formatDate(problemScore.bestSubmission.submittedAt)
                              : "-"
                          }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              @click="closeModal"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();

// 模态框状态
const isModalOpen = ref(false);
const selectedTeam = ref<TeamLeaderboardEntry | null>(null);

// 打开模态框
const openModal = (team: TeamLeaderboardEntry) => {
  selectedTeam.value = team;
  isModalOpen.value = true;
};

// 关闭模态框
const closeModal = () => {
  isModalOpen.value = false;
  selectedTeam.value = null;
};

// 定义排行榜条目的数据结构
interface TeamLeaderboardEntry {
  rank: number;
  team: {
    id: string;
    name: string;
  };
  totalScore: number;
  problemScores: Array<{
    problemId: string;
    problemTitle: string;
    score: number;
    bestSubmission?: {
      id: string;
      submittedAt: Date;
      score?: number;
      user?: {
        username: string;
        avatarUrl?: string;
      };
    };
  }>;
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

// 定义完整的排行榜响应结构
interface LeaderboardResponse {
  competitionTitle: string;
  leaderboard: TeamLeaderboardEntry[];
}

// 获取排行榜数据
const { data, pending, error } = useFetch<LeaderboardResponse>(
  () => `/api/competitions/${route.params.id}/leaderboard`
);

// 获取题目数据
const {
  data: problemsData,
  pending: problemsPending,
  error: problemsError,
} = useFetch<ProblemsResponse>(() => `/api/competitions/${route.params.id}/problems`);

// 获取题目得分
const getProblemScore = (entry: TeamLeaderboardEntry, problemId: string) => {
  const problemScore = entry.problemScores.find((p) => p.problemId === problemId);
  return problemScore ? problemScore.score : undefined;
};

// 格式化日期
const formatDate = (date: Date) => {
  return new Date(date).toLocaleString("zh-CN");
};

definePageMeta({
  middleware: "auth",
});
</script>
