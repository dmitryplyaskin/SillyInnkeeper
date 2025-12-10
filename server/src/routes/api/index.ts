import { FastifyPluginAsync } from 'fastify'
import settings from './settings'

const api: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // Регистрируем роут настроек с префиксом /api
  await fastify.register(settings, { prefix: '/api' })
}

export default api

