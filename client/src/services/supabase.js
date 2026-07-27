import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null

export async function uploadImageToSupabase(file) {
  if (!file || !supabaseUrl || !supabaseAnonKey || !supabase) {
    throw new Error('Supabase storage is not configured')
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name ?? 'image.jpg'}`
  console.log('Uploading image to Supabase:', {
    fileName,
    fileSize: file.size,
    fileType: file.type,
  })

  const { data, error } = await supabase.storage
    .from('item-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream'
    })

  console.log('Supabase upload result:', { data, error })

  if (error) {
    throw error
  }

  const { data: publicData, error: publicUrlError } = supabase.storage
    .from('item-images')
    .getPublicUrl(data.path)

  console.log('Supabase public URL result:', { path: data.path, publicData, publicUrlError })

  if (publicUrlError) {
    throw publicUrlError
  }

  if (!publicData?.publicUrl) {
    throw new Error('Supabase did not return a public URL for the uploaded image')
  }

  return publicData.publicUrl
}
