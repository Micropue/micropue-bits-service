import Ban from '@primeicons/vue/ban'
import Bolt from '@primeicons/vue/bolt'
import CheckCircle from '@primeicons/vue/check-circle'
import Clock from '@primeicons/vue/clock'
import Eye from '@primeicons/vue/eye'
import EyeSlash from '@primeicons/vue/eye-slash'
import FileEdit from '@primeicons/vue/file-edit'
import Globe from '@primeicons/vue/globe'
import InfoCircle from '@primeicons/vue/info-circle'
import Key from '@primeicons/vue/key'
import Lock from '@primeicons/vue/lock'
import PowerOff from '@primeicons/vue/power-off'
import Send from '@primeicons/vue/send'
import TimesCircle from '@primeicons/vue/times-circle'
import Trash from '@primeicons/vue/trash'
import User from '@primeicons/vue/user'

// 统一的状态图标：Tag / 行内状态文字共用
export function statusIcon(status: string) {
  switch (status) {
    case 'normal':
    case 'active':
    case 'bound':
    case 'approved':
    case 'published':
    case 'closed':
    case 'verified':
    case 'on':
    case 'set':
      return CheckCircle
    case 'key':
      return Key
    case 'always-on':
      return Bolt
    case 'pending':
    case 'open':
      return Clock
    case 'read':
      return Eye
    case 'draft':
    case 'unset':
      return FileEdit
    case 'disabled':
    case 'unbound':
    case 'ignored':
      return Ban
    case 'failed':
    case 'rejected':
      return TimesCircle
    case 'deleted':
    case 'removed':
      return Trash
    case 'restricted':
    case 'private':
      return Lock
    case 'public':
      return Globe
    case 'unlisted':
      return EyeSlash
    case 'off':
    case 'turned-off':
      return PowerOff
    case 'sent':
      return Send
    case 'you':
      return User
    default:
      return InfoCircle
  }
}
