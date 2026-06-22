const activeSteps = new Map<string, string>()

export function setStep(filePath: string, step: string): void {
  activeSteps.set(filePath, step)
}

export function clearStep(filePath: string): void {
  activeSteps.delete(filePath)
}

export function dumpActiveSteps(): string {
  if (activeSteps.size === 0) return ''

  const entries = Array.from(activeSteps.entries())
    .map(([path, step]) => `"${path}" @ ${step}`)
    .join(', ')

  return `active steps: [${entries}]`
}