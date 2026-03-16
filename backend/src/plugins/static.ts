import { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';

export async function staticPlugin(app: FastifyInstance) {
  // 服务前端静态文件
  app.register(fastifyStatic, {
    root: path.join(__dirname, '../../../frontend/dist'),
    prefix: '/',
  });

  // 当请求未匹配的路由时，返回 index.html（SPA 路由）
  app.setNotFoundHandler((req, res) => {
    if (req.method === 'GET' && req.url?.startsWith('/api') === false) {
      return res.sendFile('index.html');
    }

    return res.status(404).send({ error: 'Not Found' });
  });
}
