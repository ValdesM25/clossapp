import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read .env manually
const envContent = fs.readFileSync('.env', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=')
  if (key && vals.length) {
    envVars[key.trim()] = vals.join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase env vars:", envVars)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const { data: prendas, error } = await supabase
    .from('prendas')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching prendas:", error)
    return
  }

  console.log(`Total prendas en BD: ${prendas.length}`)

  // Group by name & category & user_id
  const map = new Map()
  for (const p of prendas) {
    const key = `${p.user_id}::${p.name}::${p.category}`
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key).push(p)
  }

  console.log("\n--- PRENDAS DUPLICADAS ENCONTRADAS ---")
  let dupCount = 0
  for (const [key, list] of map.entries()) {
    if (list.length > 1) {
      dupCount++
      console.log(`\nGrupo: ${key} (${list.length} instancias):`)
      for (const p of list) {
        console.log(`  - ID: ${p.id} | Name: "${p.name}" | Categoría: "${p.category}" | Usos: ${p.usos} | Último Uso: ${p.ultimo_uso} | Creado: ${p.created_at}`)
      }
    }
  }

  if (dupCount === 0) {
    console.log("No se encontraron prendas duplicadas por (user_id + name + category).")
  }

  // Also group by name regardless of category/user_id
  console.log("\n--- TODAS LAS PRENDAS POR NOMBRE ---")
  const nameMap = new Map()
  for (const p of prendas) {
    const key = `${p.name}`
    if (!nameMap.has(key)) nameMap.set(key, [])
    nameMap.get(key).push(p)
  }
  for (const [name, list] of nameMap.entries()) {
    if (list.length > 1) {
      console.log(`\nNombre: "${name}" (${list.length} instancias):`)
      for (const p of list) {
        console.log(`  - ID: ${p.id} | User: ${p.user_id} | Categoría: ${p.category} | Usos: ${p.usos} | Creado: ${p.created_at}`)
      }
    }
  }
}

run()
