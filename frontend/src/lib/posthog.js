import posthog from 'posthog-js'

const token = import.meta.env.VITE_POSTHOG_KEY
const apiHost = import.meta.env.VITE_POSTHOG_HOST
const missingVariable = !token
  ? 'VITE_POSTHOG_KEY'
  : !apiHost
    ? 'VITE_POSTHOG_HOST'
    : null

if (!missingVariable) {
  posthog.init(token, {
    api_host: apiHost,
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  })
} else if (!import.meta.env.PROD) {
  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  )
}

export default posthog
