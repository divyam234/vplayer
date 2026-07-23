import type { ComponentProps, FC } from 'react'
import CameraIcon from '~icons/lucide/camera'
import CheckIcon from '~icons/lucide/check'
import ChevronLeftIcon from '~icons/lucide/chevron-left'
import FlipIcon from '~icons/lucide/flip-horizontal-2'
import InfoIcon from '~icons/lucide/info'
import SpinnerIcon from '~icons/lucide/loader-2'
import FullscreenIcon from '~icons/lucide/maximize'
import FullscreenExitIcon from '~icons/lucide/minimize'
import MiniPlayerIcon from '~icons/lucide/minimize-2'
import AspectRatioIcon from '~icons/lucide/monitor'
import PauseIcon from '~icons/lucide/pause'
import PipIcon from '~icons/lucide/picture-in-picture-2'
import PlayIcon from '~icons/lucide/play'
import LoopIcon from '~icons/lucide/repeat'
import ReplayIcon from '~icons/lucide/rotate-ccw'
import SettingsIcon from '~icons/lucide/settings-2'
import SkipBackIcon from '~icons/lucide/skip-back'
import SkipForwardIcon from '~icons/lucide/skip-forward'
import VolumeLowIcon from '~icons/lucide/volume-1'
import VolumeHighIcon from '~icons/lucide/volume-2'
import VolumeOffIcon from '~icons/lucide/volume-x'
import CloseIcon from '~icons/lucide/x'

export type IconComponent = typeof PlayIcon

export interface PlayerIcons {
  play: IconComponent
  pause: IconComponent
  replay: IconComponent
  skipBack: IconComponent
  skipForward: IconComponent
  volumeHigh: IconComponent
  volumeLow: IconComponent
  volumeOff: IconComponent
  settings: IconComponent
  pip: IconComponent
  miniPlayer: IconComponent
  close: IconComponent
  fullscreen: IconComponent
  fullscreenExit: IconComponent
  chevronLeft: IconComponent
  check: IconComponent
  spinner: IconComponent
  screenshot: IconComponent
  flip: IconComponent
  aspectRatio: IconComponent
  info: IconComponent
  loop: IconComponent
}

export const defaultPlayerIcons: PlayerIcons = {
  play: PlayIcon,
  pause: PauseIcon,
  replay: ReplayIcon,
  skipBack: SkipBackIcon,
  skipForward: SkipForwardIcon,
  volumeHigh: VolumeHighIcon,
  volumeLow: VolumeLowIcon,
  volumeOff: VolumeOffIcon,
  settings: SettingsIcon,
  pip: PipIcon,
  miniPlayer: MiniPlayerIcon,
  close: CloseIcon,
  fullscreen: FullscreenIcon,
  fullscreenExit: FullscreenExitIcon,
  chevronLeft: ChevronLeftIcon,
  check: CheckIcon,
  spinner: SpinnerIcon,
  screenshot: CameraIcon,
  flip: FlipIcon,
  aspectRatio: AspectRatioIcon,
  info: InfoIcon,
  loop: LoopIcon,
}

interface IconProps extends ComponentProps<typeof PlayIcon> {
  icon: IconComponent
}

export const Icon: FC<IconProps> = ({ icon: Component, ...props }) => <Component {...props} />
