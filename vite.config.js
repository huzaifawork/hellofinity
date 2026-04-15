import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE_ ones) for use in server middleware
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),

      // ── Local dev API middleware ─────────────────────────────────────────
      // Mirrors the Vercel serverless function at api/create-payment-intent.js
      // so `npm run dev` works without needing `vercel dev`.
      {
        name: 'stripe-api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/create-payment-intent', async (req, res) => {
            res.setHeader('Content-Type', 'application/json')

            if (req.method === 'OPTIONS') {
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
              res.statusCode = 200
              return res.end()
            }

            if (req.method !== 'POST') {
              res.statusCode = 405
              return res.end(JSON.stringify({ error: 'Method not allowed' }))
            }

            // Read request body
            let raw = ''
            for await (const chunk of req) raw += chunk

            try {
              const secretKey = env.STRIPE_SECRET_KEY
              if (!secretKey) {
                res.statusCode = 500
                return res.end(JSON.stringify({ error: 'STRIPE_SECRET_KEY not set in .env' }))
              }

              const { default: Stripe } = await import('stripe')
              const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' })
              const { email } = JSON.parse(raw || '{}')

              const paymentIntent = await stripe.paymentIntents.create({
                amount: 1299,
                currency: 'gbp',
                automatic_payment_methods: { enabled: true },
                receipt_email: email || undefined,
                metadata: {
                  product: 'hellofinity_day_one_pass',
                  price_display: '£12.99',
                },
                description: 'HelloFinity — Day One Pass (lifetime access)',
              })

              res.statusCode = 200
              res.end(JSON.stringify({ clientSecret: paymentIntent.client_secret }))
            } catch (err) {
              console.error('[Stripe middleware]', err.message)
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
          })
        },
      },
    ],
    server: { port: 5173 },
    test: {
      environment: 'node',
      include: ['src/**/*.test.js'],
    },
  }
})
