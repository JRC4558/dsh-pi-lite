// Copy the bundled skill into the Harness home so skill-filesystem discovers it.
// Runs on install; set DSH_HOME to target a non-default home.
import { cp, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const home = process.env.DSH_HOME || join(homedir(), '.dsh')
const target = join(home, 'skills', 'pi-lite')
const source = fileURLToPath(new URL('../skills/pi-lite/', import.meta.url))

try {
  await mkdir(target, { recursive: true })
  await cp(source, target, { recursive: true, force: true })
  console.log(`dsh-pi-lite: skill installed at ${target}`)
} catch (error) {
  console.warn(`dsh-pi-lite: could not install skill into ${target}: ${error.message}`)
}
