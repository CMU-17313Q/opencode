export function formatDuration(secs: number) {
  let result: string
  if (secs <= 0) {
    result = ""
  } else if (secs < 60) {
    result = `${secs}s`
  } else if (secs < 3600) {
    const mins = Math.floor(secs / 60)
    const remaining = secs % 60
    result = remaining > 0 ? `${mins}m ${remaining}s` : `${mins}m`
  } else if (secs < 86400) {
    const hours = Math.floor(secs / 3600)
    const remaining = Math.floor((secs % 3600) / 60)
    result = remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
  } else if (secs < 604800) {
    const days = Math.floor(secs / 86400)
    result = days === 1 ? "~1 day" : `~${days} days`
  } else {
    const weeks = Math.floor(secs / 604800)
    result = weeks === 1 ? "~1 week" : `~${weeks} weeks`
  }
  return result
}
