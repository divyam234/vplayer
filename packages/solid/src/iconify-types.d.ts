/**
 * Type declarations for the <iconify-icon> custom element (web component).
 * Import as side-effect: `import 'iconify-icon'`
 */
import 'solid-js'

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': IconifyIconAttributes
    }

    interface IconifyIconAttributes extends HTMLAttributes<HTMLElement> {
      icon?: string
      width?: string | number
      height?: string | number
      flip?: string
      rotate?: string
      inline?: boolean | string
      mode?: string
      noobserver?: boolean | string
    }
  }
}
