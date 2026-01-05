import { fetchAuth } from './api'

export async function updateUserProfile(data: { phone?: string; email?: string }) {
  const res = await fetchAuth('/api/users/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}
