const express = require('express');
const app = express();
const PORT = process.env.ADMIN_PORT || 4002;
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.listen(PORT, () => {
  console.log(`Local admin service listening on ${PORT}`);
});
