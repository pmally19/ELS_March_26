import express from 'express';

console.log('🔧 Loading test-simple-routes.ts...');

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Test route working!' });
});

console.log('🔧 test-simple-routes.ts loaded successfully');

export default router;
