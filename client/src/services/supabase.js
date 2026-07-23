import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

export async function uploadImageToSupabase(file) {
  if (!file || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase storage is not configured')
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`
  const { data, error } = await supabase.storage
    .from('item-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw error
  }

  const { data: publicData } = supabase.storage.from('item-images').getPublicUrl(data.path)

  return publicData.publicUrl
}
