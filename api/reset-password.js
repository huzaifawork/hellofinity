import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, newPassword } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server configuration error (missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL)' })
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Find the user by email
    // listUsers paginates, but since it's a simple implementation we can use it.
    // Or we use the Admin API to update users.
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) throw listError

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())

    if (!user) {
      // Return 200 instead of error to avoid leaking user existence
      return res.status(200).json({ message: 'If an account exists, the password has been reset.' })
    }

    // 2. Update the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) throw updateError

    return res.status(200).json({ message: 'Password updated successfully' })
  } catch (err) {
    console.error('Reset password error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
