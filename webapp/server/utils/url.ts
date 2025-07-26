import { getPublicFileUrl } from './minio'

export function processTeamAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null

  try {
    // 解析avatarUrl，格式为 "avatars/..."
    const parts = avatarUrl.split('/')
    const bucketName = parts[0]
    const objectName = parts.slice(1).join('/')

    // 生成公共URL
    return getPublicFileUrl(bucketName, objectName)
  } catch (error) {
    console.error('Error processing team avatar URL:', error)
    return null
  }
}

export function processUserAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null

  try {
    // 解析avatarUrl，格式为 "avatars/..."
    const parts = avatarUrl.split('/')
    const bucketName = parts[0]
    const objectName = parts.slice(1).join('/')

    // 生成公共URL
    return getPublicFileUrl(bucketName, objectName)
  } catch (error) {
    console.error('Error processing user avatar URL:', error)
    return null
  }
}

export function processTeamData(team: any): any {
  if (!team) return team

  // 处理团队头像URL
  if (team.avatarUrl) {
    team.avatarUrl = processTeamAvatarUrl(team.avatarUrl)
  }

  // 处理创建者头像URL
  if (team.members && Array.isArray(team.members)) {
    const creator = team.members.find(member => member.role === 'CREATOR');
    if (creator && creator.user && creator.user.avatarUrl) {
      creator.user.avatarUrl = processTeamAvatarUrl(creator.user.avatarUrl);
    }
  }

  // 处理成员头像URL
  if (team.members && Array.isArray(team.members)) {
    team.members = team.members.map((member: any) => {
      if (member.user && member.user.avatarUrl) {
        member.user.avatarUrl = processTeamAvatarUrl(member.user.avatarUrl)
      }
      return member
    })
  }

  return team
}

export function processBannerUrl(bannerUrl: string | null): string | null {
  if (!bannerUrl) return null

  try {
    return getPublicFileUrl('banners', bannerUrl)
  } catch (error) {
    console.error('Error processing banner URL:', error)
    return null
  }
}