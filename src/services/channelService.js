const API_URL = import.meta.env.VITE_API_BASE_URL

export const channelService = {
  async getStatus(email) {
    const token = localStorage.getItem('cloudnotify_token')
    const res = await fetch(
      `${API_URL}/user/channels?email=${encodeURIComponent(email)}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    )

    if (!res.ok) {
      throw new Error('Failed to load channel status')
    }

    return await res.json()
  }
}