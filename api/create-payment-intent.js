import Stripe from 'stripe'

// Day One Pass — £12.99 (pence)
const DAY_ONE_PRICE_PENCE = 1299

export default async function handler(req, res) {
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return res.status(500).json({ error: 'Stripe secret key not configured.' })

  try {
    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' })
    const { email } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}

    const paymentIntent = await stripe.paymentIntents.create({
      amount: DAY_ONE_PRICE_PENCE,
      currency: 'gbp',
      automatic_payment_methods: { enabled: true },
      receipt_email: email || undefined,
      metadata: {
        product: 'hellofinity_day_one_pass',
        price_display: '£12.99',
      },
      description: 'HelloFinity — Day One Pass (lifetime access)',
    })

    return res.status(200).json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('Stripe error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
