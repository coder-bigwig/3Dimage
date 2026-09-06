import { spawn } from 'node:child_process'

export const CONVERTER_IMAGE = 'ghcr.io/medical3d/model-converter@sha256:replace-with-reviewed-digest'

export function conversionArguments(inputPath: string, outputDirectory: string): string[] {
  return ['run', '--rm', '--network=none', '--read-only', '-v', `${inputPath}:/input/model:ro`, '-v', `${outputDirectory}:/output`, CONVERTER_IMAGE, '--input', '/input/model', '--output', '/output']
}

export function runConverter(inputPath: string, outputDirectory: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', conversionArguments(inputPath, outputDirectory), { stdio: 'inherit', shell: false })
    child.once('error', reject)
    child.once('close', code => resolve(code ?? 1))
  })
}
