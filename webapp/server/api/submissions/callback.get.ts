// server/api/submissions/callback.get.ts

export default defineEventHandler(async (event) => {
    try {
        // 从回调URL的查询参数中获取数据
        // 例如: /api/submissions/callback?submissionId=xxx&score=95
        const query = getQuery(event);
        const submissionId = query.submissionId as string;
        const score = parseFloat(query.score as string);
        const stdout = query.stdout as string;
        const stderr = query.stderr as string;

        // 这里添加您的回调处理逻辑
        // 例如，验证回调请求的合法性，更新数据库中的提交状态和分数等

        console.log(`收到评测回调，提交ID: ${submissionId}, 分数: ${score}`);

        if (!submissionId) {
            throw new Error('回调缺少 submissionId');
        }

        // 更新数据库中的提交记录
        // 注意：这里我们使用 `update` 而不是 `findUnique`
        const updatedSubmission = await prisma.submission.update({
            where: {
                id: submissionId,
            },
            data: {
                status: 'COMPLETED',
                score: score,
                stdout: stdout,
                stderr: stderr,
                judgedAt: new Date(),
            },
        });

        // 返回成功响应
        return {
            success: true,
            message: '回调处理成功',
            submissionId: updatedSubmission.id,
        };

    } catch (error: any) {
        console.error('处理评测回调时出错:', error);

        // 返回错误响应
        return sendError(event, createError({
            statusCode: 500,
            statusMessage: '处理回调失败',
            data: error.message,
        }));
    }
});