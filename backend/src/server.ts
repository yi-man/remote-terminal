import fastify from 'fastify';
import { registerRoutes } from './routes';
import { staticPlugin } from './plugins/static';
import { socketIoPlugin } from './plugins/socket.io';

const PORT = 8080;

const app = fastify({
  logger: {
    level: 'info',
  },
});

// 启用 CORS
app.addHook('preHandler', (req, res, done) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-user-id');

  if (req.method === 'OPTIONS') {
    res.send();
    return;
  }

  done();
});

// 注册插件
app.register(staticPlugin);
app.register(socketIoPlugin);

// 注册路由
app.register(registerRoutes);

app.listen({ port: PORT }, (err, address) => {
  if (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }

  console.log(`🚀 Server running on ${address}`);
  console.log(`📊 Health check: ${address}/health`);
});
