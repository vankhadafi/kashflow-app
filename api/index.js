const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is missing');
    }
    connectionString = connectionString.split('?')[0];

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return pool;
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const p = getPool();

  try {
    const { action } = req.query;

    // --- GET ALL TRANSACTIONS & BUDGET ---
    if (req.method === 'GET') {
      const { rows: txs } = await p.query('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
      const { rows: settings } = await p.query("SELECT value FROM settings WHERE key = 'monthly_budget'");
      
      const budget = settings.length > 0 ? Number(settings[0].value) : 5000000;
      
      // Format response
      const formattedTxs = txs.map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        desc: t.description,
        category: t.category,
        date: t.date.toISOString ? t.date.toISOString().split('T')[0] : t.date
      }));

      return res.status(200).json({
        success: true,
        transactions: formattedTxs,
        monthlyBudget: budget
      });
    }

    // --- POST: CREATE / UPDATE TRANSACTION ---
    if (req.method === 'POST') {
      const { id, type, amount, desc, category, date } = req.body;

      if (action === 'save_budget') {
        const { budget } = req.body;
        await p.query(
          "INSERT INTO settings (key, value) VALUES ('monthly_budget', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
          [budget.toString()]
        );
        return res.status(200).json({ success: true, message: 'Budget updated' });
      }

      if (!amount || !desc || !date) {
        return res.status(400).json({ error: 'Data tidak lengkap' });
      }

      const txId = id || ('tx-' + Date.now());
      await p.query(
        `INSERT INTO transactions (id, type, amount, description, category, date)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           type = EXCLUDED.type,
           amount = EXCLUDED.amount,
           description = EXCLUDED.description,
           category = EXCLUDED.category,
           date = EXCLUDED.date`,
        [txId, type, amount, desc, category, date]
      );

      return res.status(200).json({ success: true, id: txId });
    }

    // --- DELETE TRANSACTION ---
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing ID' });

      await p.query('DELETE FROM transactions WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
