import type { Settings } from '@/shared/types/settings'

export async function getSettings(): Promise<Settings> {
  const response = await fetch('/api/settings')
  
  if (!response.ok) {
    throw new Error(`Ошибка загрузки настроек: ${response.statusText}`)
  }
  
  return response.json()
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Ошибка сохранения настроек: ${response.statusText}`)
  }
  
  return response.json()
}

