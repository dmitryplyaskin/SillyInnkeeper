import { FastifyPluginAsync } from 'fastify'
import { getSettings, updateSettings, Settings } from '../../services/settings'

const settings: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // GET /api/settings - получение текущих настроек
  fastify.get('/settings', async function (request, reply) {
    try {
      const settings = await getSettings()
      return settings
    } catch (error) {
      fastify.log.error(error, 'Ошибка при получении настроек')
      return reply.internalServerError('Не удалось получить настройки')
    }
  })

  // PUT /api/settings - обновление настроек (полное обновление)
  fastify.put<{ Body: Settings }>('/settings', async function (request, reply) {
    try {
      const newSettings = request.body

      // Валидация структуры данных
      if (
        typeof newSettings !== 'object' ||
        newSettings === null ||
        !('cardsFolderPath' in newSettings) ||
        !('sillytavenrPath' in newSettings)
      ) {
        return reply.badRequest('Неверный формат данных. Ожидается объект с полями cardsFolderPath и sillytavenrPath')
      }

      // Полное обновление настроек (валидация путей происходит внутри updateSettings)
      const savedSettings = await updateSettings(newSettings)
      return savedSettings
    } catch (error) {
      fastify.log.error(error, 'Ошибка при обновлении настроек')
      
      // Если ошибка валидации пути, возвращаем подробную ошибку
      if (error instanceof Error && error.message.includes('Путь не существует')) {
        return reply.badRequest(error.message)
      }
      
      return reply.internalServerError('Не удалось обновить настройки')
    }
  })
}

export default settings

